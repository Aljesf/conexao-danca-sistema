import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

type LiquidacaoModo = "PAGAR_AGORA" | "LANCAR_NO_CARTAO" | "ADIAR_EXCECAO" | "MOVIMENTO";
type MetodoLiquidacao = "CARTAO_CONEXAO" | "COBRANCAS_LEGADO" | "CREDITO_BOLSA" | "OUTRO";

type Payload = {
  matricula_id: number;
  tipo_primeira_cobranca: "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
  modo: LiquidacaoModo;

  // pagamento no ato (quando PAGAR_AGORA)
  forma_pagamento_id?: number;
  // valor passa a ser opcional: se nao vier, herda da matricula
  valor_centavos?: number;
  data_pagamento?: string; // YYYY-MM-DD
  observacoes?: string;

  // excecao (quando ADIAR_EXCECAO)
  motivo_excecao?: string;
  vencimento_manual?: string; // YYYY-MM-DD
  meio_cobranca?: string; // BOLETO | FIMP | OUTRO
};

type LedgerTipo = "ENTRADA" | "PARCELA" | "LANCAMENTO_CREDITO" | "OUTRO";

type LedgerInsert = {
  matricula_id: number;
  tipo: LedgerTipo;
  descricao: string;
  valor_centavos: number;
  vencimento: string | null;
  data_evento: string | null;
  status: string;
  origem_tabela: string | null;
  origem_id: number | null;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type TurmaAlunoRow = {
  turma_id: number | null;
  status?: string | null;
  dt_inicio?: string | null;
  dt_fim?: string | null;
};

type TurmaVinculada = {
  turma_id: number;
  status: string | null;
  dt_inicio: string | null;
  dt_fim: string | null;
};

type ComposicaoItem = {
  turma_id: number;
  ue_id: number | null;
  descricao: string;
  valor_centavos: number;
};

type ResolverResp = {
  ok: boolean;
  data?: {
    valor_final_centavos?: number | null;
    item_aplicado?: { valor_centavos: number; descricao?: string | null };
  };
  message?: string;
  error?: string;
};

type MatriculaSnapshot = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
  primeira_cobranca_status: string | null;
  primeira_cobranca_valor_centavos: number | null;
  total_mensalidade_centavos: number | null;
  ano_referencia: number | null;
  data_inicio_vinculo: string | null;
  data_matricula: string | null;
  vinculo_id: number | null;
  metodo_liquidacao: MetodoLiquidacao;
  movimento_concessao_id: string | null;
};

type MovimentoConcessaoAtiva = {
  id: string;
  beneficiario_id: string;
  dia_vencimento_ciclo: number;
};

function asInt(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return Math.trunc(n);
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) return Math.trunc(Number(n));
  return null;
}

function asPgErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function asPgErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "erro_desconhecido";
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : "erro_desconhecido";
}

function isSchemaMissingError(err: unknown): boolean {
  const code = asPgErrorCode(err);
  if (code === "42P01" || code === "42703") return true;
  const msg = asPgErrorMessage(err).toLowerCase();
  return msg.includes("does not exist") || msg.includes("relation") || msg.includes("column");
}

function asMetodoLiquidacao(value: unknown): MetodoLiquidacao {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "CARTAO_CONEXAO") return "CARTAO_CONEXAO";
  if (raw === "COBRANCAS_LEGADO") return "COBRANCAS_LEGADO";
  if (raw === "CREDITO_BOLSA") return "CREDITO_BOLSA";
  if (raw === "OUTRO") return "OUTRO";
  return "CARTAO_CONEXAO";
}

function asUuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

async function fetchMatriculaById(params: {
  supabase: SupabaseAdminClient;
  matriculaId: number;
}): Promise<{ matricula: MatriculaSnapshot | null; errorMessage?: string }> {
  const { supabase, matriculaId } = params;
  const { data, error } = await supabase.from("matriculas").select("*").eq("id", matriculaId).maybeSingle();
  if (error) return { matricula: null, errorMessage: error.message };
  if (!data) return { matricula: null };

  const record = data as Record<string, unknown>;
  const id = asInt(record.id);
  const pessoaId = asInt(record.pessoa_id);
  const respFinId = asInt(record.responsavel_financeiro_id);
  if (!id || !pessoaId || !respFinId) return { matricula: null, errorMessage: "dados_matricula_invalidos" };

  return {
    matricula: {
      id,
      pessoa_id: pessoaId,
      responsavel_financeiro_id: respFinId,
      primeira_cobranca_status:
        typeof record.primeira_cobranca_status === "string" ? record.primeira_cobranca_status : null,
      primeira_cobranca_valor_centavos: asInt(record.primeira_cobranca_valor_centavos),
      total_mensalidade_centavos: asInt(record.total_mensalidade_centavos),
      ano_referencia: asInt(record.ano_referencia),
      data_inicio_vinculo: asDateStr(record.data_inicio_vinculo),
      data_matricula: asDateStr(record.data_matricula),
      vinculo_id: asInt(record.vinculo_id),
      metodo_liquidacao: asMetodoLiquidacao(record.metodo_liquidacao),
      movimento_concessao_id: asUuidOrNull(record.movimento_concessao_id),
    },
  };
}

function isConcessaoAtivaHoje(concessao: {
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
}): boolean {
  const status = typeof concessao.status === "string" ? concessao.status.toUpperCase() : "";
  if (status !== "ATIVA") return false;
  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = asDateStr(concessao.data_inicio ?? null);
  const fim = asDateStr(concessao.data_fim ?? null);
  if (inicio && inicio > hoje) return false;
  if (fim && fim < hoje) return false;
  return true;
}

async function resolveMovimentoConcessaoAtiva(params: {
  supabase: SupabaseAdminClient;
  pessoaId: number;
  movimentoConcessaoId: string | null;
}): Promise<{ concessao: MovimentoConcessaoAtiva | null; error?: string; schemaMissing?: boolean }> {
  const { supabase, pessoaId, movimentoConcessaoId } = params;
  const hoje = new Date().toISOString().slice(0, 10);

  try {
    if (movimentoConcessaoId) {
      const { data: concessaoData, error: concessaoErr } = await supabase
        .from("movimento_concessoes")
        .select("id,beneficiario_id,status,data_inicio,data_fim,dia_vencimento_ciclo")
        .eq("id", movimentoConcessaoId)
        .maybeSingle();

      if (concessaoErr) return { concessao: null, error: concessaoErr.message, schemaMissing: isSchemaMissingError(concessaoErr) };
      if (!concessaoData) return { concessao: null, error: "movimento_concessao_nao_encontrada" };
      if (!isConcessaoAtivaHoje(concessaoData as { status?: string; data_inicio?: string; data_fim?: string })) {
        return { concessao: null, error: "movimento_concessao_inativa" };
      }

      const beneficiarioId = asUuidOrNull((concessaoData as { beneficiario_id?: unknown }).beneficiario_id);
      if (!beneficiarioId) return { concessao: null, error: "movimento_concessao_invalida" };

      const { data: benefData, error: benefErr } = await supabase
        .from("movimento_beneficiarios")
        .select("id,pessoa_id")
        .eq("id", beneficiarioId)
        .maybeSingle();

      if (benefErr) return { concessao: null, error: benefErr.message, schemaMissing: isSchemaMissingError(benefErr) };
      const pessoaIdConcessao = asInt((benefData as { pessoa_id?: unknown } | null)?.pessoa_id);
      if (!benefData || pessoaIdConcessao !== pessoaId) {
        return { concessao: null, error: "movimento_concessao_nao_pertence_ao_aluno" };
      }

      const diaVencimento = asInt((concessaoData as { dia_vencimento_ciclo?: unknown }).dia_vencimento_ciclo) ?? 1;
      return {
        concessao: {
          id: String((concessaoData as { id?: unknown }).id),
          beneficiario_id: beneficiarioId,
          dia_vencimento_ciclo: Math.min(28, Math.max(1, diaVencimento)),
        },
      };
    }

    const { data: benefRows, error: benefErr } = await supabase
      .from("movimento_beneficiarios")
      .select("id")
      .eq("pessoa_id", pessoaId);

    if (benefErr) return { concessao: null, error: benefErr.message, schemaMissing: isSchemaMissingError(benefErr) };

    const beneficiarioIds = (benefRows ?? [])
      .map((row) => asUuidOrNull((row as { id?: unknown }).id))
      .filter((id): id is string => !!id);

    if (beneficiarioIds.length === 0) return { concessao: null, error: "movimento_sem_beneficiario" };

    const { data: concessoes, error: concErr } = await supabase
      .from("movimento_concessoes")
      .select("id,beneficiario_id,status,data_inicio,data_fim,dia_vencimento_ciclo,criado_em")
      .in("beneficiario_id", beneficiarioIds)
      .eq("status", "ATIVA")
      .order("criado_em", { ascending: false });

    if (concErr) return { concessao: null, error: concErr.message, schemaMissing: isSchemaMissingError(concErr) };

    const ativa = (concessoes ?? []).find((row) => {
      const registro = row as { data_inicio?: string | null; data_fim?: string | null };
      const inicio = asDateStr(registro.data_inicio ?? null);
      const fim = asDateStr(registro.data_fim ?? null);
      if (inicio && inicio > hoje) return false;
      if (fim && fim < hoje) return false;
      return true;
    });

    if (!ativa) return { concessao: null, error: "movimento_sem_concessao_ativa" };

    const diaVencimento = asInt((ativa as { dia_vencimento_ciclo?: unknown }).dia_vencimento_ciclo) ?? 1;
    const concessaoId = asUuidOrNull((ativa as { id?: unknown }).id);
    const beneficiarioId = asUuidOrNull((ativa as { beneficiario_id?: unknown }).beneficiario_id);
    if (!concessaoId || !beneficiarioId) return { concessao: null, error: "movimento_concessao_invalida" };

    return {
      concessao: {
        id: concessaoId,
        beneficiario_id: beneficiarioId,
        dia_vencimento_ciclo: Math.min(28, Math.max(1, diaVencimento)),
      },
    };
  } catch (err) {
    return {
      concessao: null,
      error: asPgErrorMessage(err),
      schemaMissing: isSchemaMissingError(err),
    };
  }
}

async function registrarConsumoInstitucionalMovimento(params: {
  supabase: SupabaseAdminClient;
  matriculaId: number;
  pessoaId: number;
  movimentoConcessaoId: string | null;
  userId: string;
  valorCentavos: number;
  tipoPrimeira: Payload["tipo_primeira_cobranca"];
}): Promise<
  | {
      ok: true;
      concessao_id: string;
      ciclo_id: string;
      beneficiario_id: string;
      competencia: string;
    }
  | { ok: false; status: number; error: string; details?: string }
> {
  const { supabase, matriculaId, pessoaId, movimentoConcessaoId, userId, valorCentavos, tipoPrimeira } = params;
  const resolved = await resolveMovimentoConcessaoAtiva({ supabase, pessoaId, movimentoConcessaoId });
  if (!resolved.concessao) {
    if (resolved.schemaMissing) {
      return {
        ok: false,
        status: 409,
        error: "movimento_schema_indisponivel",
        details: resolved.error ?? "Tabela/coluna do Movimento nao disponivel.",
      };
    }
    return {
      ok: false,
      status: 409,
      error: resolved.error ?? "movimento_sem_concessao_ativa",
    };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const competencia = `${hoje.slice(0, 7)}-01`;
  const dia = String(resolved.concessao.dia_vencimento_ciclo).padStart(2, "0");
  const dtVencimento = `${hoje.slice(0, 7)}-${dia}`;
  const observacoes = `Liquidacao institucional matricula #${matriculaId} (${tipoPrimeira}) valor=${valorCentavos}`;

  const { data: cicloExist, error: cicloFindErr } = await supabase
    .from("movimento_concessoes_ciclos")
    .select("id")
    .eq("concessao_id", resolved.concessao.id)
    .eq("competencia", competencia)
    .maybeSingle();

  if (cicloFindErr) {
    return {
      ok: false,
      status: isSchemaMissingError(cicloFindErr) ? 409 : 500,
      error: isSchemaMissingError(cicloFindErr) ? "movimento_schema_indisponivel" : "movimento_falha_buscar_ciclo",
      details: cicloFindErr.message,
    };
  }

  const cicloIdExistente = asUuidOrNull((cicloExist as { id?: unknown } | null)?.id);
  if (cicloIdExistente) {
    return {
      ok: true,
      concessao_id: resolved.concessao.id,
      ciclo_id: cicloIdExistente,
      beneficiario_id: resolved.concessao.beneficiario_id,
      competencia,
    };
  }

  const { data: cicloNovo, error: cicloErr } = await supabase
    .from("movimento_concessoes_ciclos")
    .insert({
      concessao_id: resolved.concessao.id,
      competencia,
      dt_vencimento: dtVencimento,
      observacoes,
      criado_por: userId,
    })
    .select("id")
    .single();

  if (cicloErr || !cicloNovo) {
    return {
      ok: false,
      status: isSchemaMissingError(cicloErr) ? 409 : 500,
      error: isSchemaMissingError(cicloErr) ? "movimento_schema_indisponivel" : "movimento_falha_registrar_consumo",
      details: cicloErr?.message ?? "erro_desconhecido",
    };
  }

  const cicloId = asUuidOrNull((cicloNovo as { id?: unknown }).id);
  if (!cicloId) {
    return { ok: false, status: 500, error: "movimento_ciclo_id_invalido" };
  }

  return {
    ok: true,
    concessao_id: resolved.concessao.id,
    ciclo_id: cicloId,
    beneficiario_id: resolved.concessao.beneficiario_id,
    competencia,
  };
}

async function resolverMensalidadePorTurma(params: {
  request: Request;
  cookieHeader: string;
  alunoId: number;
  turmaId: number;
  anoRef: number;
  tierOrdemOverride: number;
}): Promise<{ valor_centavos: number; descricao: string | null }> {
  const { request, cookieHeader, alunoId, turmaId, anoRef, tierOrdemOverride } = params;
  const resolveUrl = new URL("/api/matriculas/precos/resolver", request.url);
  resolveUrl.searchParams.set("aluno_id", String(alunoId));
  resolveUrl.searchParams.set("alvo_tipo", "TURMA");
  resolveUrl.searchParams.set("alvo_id", String(turmaId));
  resolveUrl.searchParams.set("ano", String(anoRef));
  resolveUrl.searchParams.set("tier_ordem_override", String(tierOrdemOverride));

  const resolveRes = await fetch(resolveUrl.toString(), { headers: { cookie: cookieHeader } });
  let payload: ResolverResp | null = null;
  try {
    payload = (await resolveRes.json()) as ResolverResp;
  } catch {
    payload = null;
  }

  if (!resolveRes.ok || !payload?.ok) {
    const message = payload?.message || payload?.error || "Falha ao resolver precificacao.";
    throw new Error(message);
  }

  const item = payload.data?.item_aplicado;
  const valor = Number(payload.data?.valor_final_centavos ?? item?.valor_centavos);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("valor_mensal_invalido");
  }
  return {
    valor_centavos: valor,
    descricao: item?.descricao ?? null,
  };
}

async function montarComposicaoMensalidade(params: {
  supabase: SupabaseAdminClient;
  request: Request;
  cookieHeader: string;
  matriculaId: number;
  alunoId: number;
  anoRef: number;
}): Promise<{ itens: ComposicaoItem[]; totalCentavos: number }> {
  const { supabase, request, cookieHeader, matriculaId, alunoId, anoRef } = params;

  const { data: taRows, error: taErr } = await supabase
    .from("turma_aluno")
    .select("turma_id,status,dt_inicio,dt_fim")
    .eq("matricula_id", matriculaId);

  if (taErr) {
    throw new Error(`falha_buscar_turma_aluno: ${taErr.message}`);
  }

  const turmaRows: TurmaVinculada[] = (taRows ?? [])
    .map((row) => {
      const record = row as TurmaAlunoRow;
      const turmaId = asInt(record.turma_id);
      if (!turmaId) return null;
      const statusRaw = record.status;
      return {
        turma_id: turmaId,
        status: typeof statusRaw === "string" ? statusRaw : statusRaw ? String(statusRaw) : null,
        dt_inicio: record.dt_inicio ? String(record.dt_inicio) : null,
        dt_fim: record.dt_fim ? String(record.dt_fim) : null,
      };
    })
    .filter((row): row is TurmaVinculada => !!row)
    .filter((row) => {
      const statusNorm = row.status ? row.status.trim().toUpperCase() : null;
      return !statusNorm || statusNorm === "ATIVO" || statusNorm === "ATIVA";
    });

  if (turmaRows.length === 0) {
    throw new Error("sem_turmas_ativas_para_matricula");
  }

  turmaRows.sort((a, b) => {
    const da = a.dt_inicio ? String(a.dt_inicio) : "";
    const db = b.dt_inicio ? String(b.dt_inicio) : "";
    if (da < db) return -1;
    if (da > db) return 1;
    return a.turma_id - b.turma_id;
  });

  const itens: ComposicaoItem[] = [];
  let totalCentavos = 0;

  for (let i = 0; i < turmaRows.length; i++) {
    const turmaId = turmaRows[i].turma_id;
    const { data: ue } = await supabase
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id, nome, denominacao")
      .eq("origem_tipo", "TURMA")
      .eq("origem_id", turmaId)
      .maybeSingle();

    const { data: turma } = await supabase
      .from("turmas")
      .select("nome")
      .eq("turma_id", turmaId)
      .maybeSingle();

    const ueId = ue?.unidade_execucao_id ? Number(ue.unidade_execucao_id) : null;
    const descricao =
      (typeof ue?.denominacao === "string" && ue.denominacao.trim()) ||
      (typeof ue?.nome === "string" && ue.nome.trim()) ||
      (typeof turma?.nome === "string" && turma.nome.trim()) ||
      `Turma ${turmaId}`;

    const resolved = await resolverMensalidadePorTurma({
      request,
      cookieHeader,
      alunoId,
      turmaId,
      anoRef,
      tierOrdemOverride: i + 1,
    });

    totalCentavos += resolved.valor_centavos;
    itens.push({
      turma_id: turmaId,
      ue_id: ueId,
      descricao,
      valor_centavos: resolved.valor_centavos,
    });
  }

  return { itens, totalCentavos };
}

async function ensureTurmaAlunoVinculos(params: {
  supabase: SupabaseAdminClient;
  matriculaId: number;
  alunoId: number;
  vinculoId: number | null;
  dataInicio: string | null;
}) {
  const { supabase, matriculaId, alunoId, vinculoId, dataInicio } = params;

  const turmaIds = new Set<number>();

  const { data: execRows, error: execErr } = await supabase
    .from("matricula_execucao_valores")
    .select("turma_id")
    .eq("matricula_id", matriculaId)
    .eq("ativo", true);

  if (execErr) {
    throw new Error(`falha_buscar_execucoes: ${execErr.message}`);
  }

  (execRows ?? []).forEach((row) => {
    const turmaId = asInt((row as { turma_id?: unknown }).turma_id);
    if (turmaId) turmaIds.add(turmaId);
  });

  if (turmaIds.size === 0 && vinculoId) {
    turmaIds.add(vinculoId);
  }

  if (turmaIds.size === 0) return;

  for (const turmaId of turmaIds) {
    const { data: taExist, error: taErr } = await supabase
      .from("turma_aluno")
      .select("turma_aluno_id, matricula_id")
      .eq("turma_id", turmaId)
      .eq("aluno_pessoa_id", alunoId)
      .is("dt_fim", null)
      .limit(1);

    if (taErr) {
      throw new Error(`falha_buscar_turma_aluno: ${taErr.message}`);
    }

    if (!taExist || taExist.length === 0) {
      const { error: taInsErr } = await supabase.from("turma_aluno").insert({
        turma_id: turmaId,
        aluno_pessoa_id: alunoId,
        matricula_id: matriculaId,
        dt_inicio: dataInicio,
        status: "ativo",
      });

      if (taInsErr) {
        throw new Error(`falha_inserir_turma_aluno: ${taInsErr.message}`);
      }
    } else if (!taExist[0]?.matricula_id) {
      const { error: taUpdErr } = await supabase
        .from("turma_aluno")
        .update({ matricula_id: matriculaId })
        .eq("turma_aluno_id", taExist[0].turma_aluno_id);

      if (taUpdErr) {
        throw new Error(`falha_atualizar_turma_aluno: ${taUpdErr.message}`);
      }
    }
  }
}

async function ensureCobrancaCartaoConexao(params: {
  supabase: SupabaseAdminClient;
  pessoaId: number;
  matriculaId: number;
  competencia: string;
  valorCentavos: number;
  vencimento: string;
  descricao: string;
}): Promise<number> {
  const { supabase, pessoaId, matriculaId, competencia, valorCentavos, vencimento, descricao } = params;

  const { data: existente, error: findErr } = await supabase
    .from("cobrancas")
    .select("id")
    .eq("pessoa_id", pessoaId)
    .eq("origem_tipo", "MATRICULA")
    .eq("origem_id", matriculaId)
    .eq("origem_subtipo", "CARTAO_CONEXAO")
    .eq("competencia_ano_mes", competencia)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    throw new Error(`falha_buscar_cobranca_cartao: ${findErr.message}`);
  }

  const existenteId = existente ? Number((existente as { id?: number }).id) : NaN;
  if (Number.isFinite(existenteId) && existenteId > 0) {
    const { error: updErr } = await supabase
      .from("cobrancas")
      .update({
        descricao,
        valor_centavos: valorCentavos,
        vencimento,
        origem_subtipo: "CARTAO_CONEXAO",
        competencia_ano_mes: competencia,
      })
      .eq("id", existenteId);

    if (updErr) {
      throw new Error(`falha_atualizar_cobranca_cartao: ${updErr.message}`);
    }

    return existenteId;
  }

  const { data: cobranca, error: insErr } = await supabase
    .from("cobrancas")
    .insert({
      pessoa_id: pessoaId,
      descricao,
      valor_centavos: valorCentavos,
      vencimento,
      status: "PENDENTE",
      origem_tipo: "MATRICULA",
      origem_id: matriculaId,
      origem_subtipo: "CARTAO_CONEXAO",
      competencia_ano_mes: competencia,
    })
    .select("id")
    .single();

  if (insErr || !cobranca) {
    throw new Error(`falha_criar_cobranca_cartao: ${insErr?.message ?? "erro_desconhecido"}`);
  }

  const id = Number((cobranca as { id?: number }).id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("cobranca_id_invalido");
  }

  return id;
}

function asDateStr(n: unknown): string | null {
  if (typeof n !== "string") return null;
  const s = n.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function toTimestamptzNoonUtc(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD}T12:00:00.000Z`;
}

async function getCentroCustoPadraoEscolaId(supabase: any): Promise<number | null> {
  const { data, error } = await supabase
    .from("escola_config_financeira")
    .select("centro_custo_padrao_escola_id")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`falha_ler_config_escola_financeira: ${error.message}`);
  }

  const id = data?.centro_custo_padrao_escola_id;
  return typeof id === "number" ? id : null;
}

async function getCentroCustoFallbackPrimeiroAtivoId(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id")
    .eq("ativo", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`falha_resolver_centro_custo_fallback: ${error?.message ?? "sem_centro_custo"}`);
  }

  return Number(data.id);
}

async function inserirMovimentoFinanceiroReceita(params: {
  supabase: any;
  centroCustoId: number | null;
  valorCentavos: number;
  dataYYYYMMDD: string;
  origemTipo: string;
  origemId: number;
  descricao: string;
}) {
  const { supabase, centroCustoId, valorCentavos, dataYYYYMMDD, origemTipo, origemId, descricao } = params;

  const centroPadrao = await getCentroCustoPadraoEscolaId(supabase);
  const centroIdFinal = centroPadrao ?? centroCustoId ?? (await getCentroCustoFallbackPrimeiroAtivoId(supabase));

  const payload: Record<string, unknown> = {
    tipo: "RECEITA",
    centro_custo_id: centroIdFinal,
    valor_centavos: valorCentavos,
    data_movimento: toTimestamptzNoonUtc(dataYYYYMMDD),
    origem: origemTipo,
    origem_id: origemId,
    descricao,
    usuario_id: null,
  };

  const { error } = await supabase.from("movimento_financeiro").insert(payload);
  if (error) {
    throw new Error(`falha_criar_movimento_financeiro: ${error.message}`);
  }
}

function ymFromDate(dateYYYYMMDD: string): string {
  return dateYYYYMMDD.slice(0, 7);
}

const DIA_CORTE_PRORATA = 12;

function yearFromDate(dateYYYYMMDD: string): number {
  return Number(dateYYYYMMDD.slice(0, 4));
}

function buildPeriodo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function buildDateFromYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function dateFromPeriodo(periodo: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return null;
  return `${periodo}-01`;
}

async function ensureContaCreditoConexaoAluno(params: { supabase: any; pessoaTitularId: number }) {
  const { supabase, pessoaTitularId } = params;

  const { data: contaExistente } = await supabase
    .from("credito_conexao_contas")
    .select("id, dia_fechamento, dia_vencimento")
    .eq("pessoa_titular_id", pessoaTitularId)
    .eq("tipo_conta", "ALUNO")
    .eq("ativo", true)
    .maybeSingle();

  if (contaExistente?.id) return contaExistente;

  const { data: contaNova, error: errNova } = await supabase
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: pessoaTitularId,
      tipo_conta: "ALUNO",
      descricao_exibicao: "Cartao Conexao ALUNO",
      dia_fechamento: 10,
      dia_vencimento: 12,
      ativo: true,
    })
    .select("id, dia_fechamento, dia_vencimento")
    .single();

  if (errNova || !contaNova) {
    throw new Error(`falha_criar_conta_credito_conexao: ${errNova?.message ?? "erro_desconhecido"}`);
  }

  return contaNova;
}

async function ensureFaturasPeriodo(params: {
  supabase: any;
  contaConexaoId: number;
  competenciaInicio: string;
  competenciaFim: string;
  diaFechamento: number;
  diaVencimento: number | null;
}) {
  const { supabase, contaConexaoId, competenciaInicio, competenciaFim, diaFechamento, diaVencimento } = params;
  const competencias = buildCompetenciasBetween(competenciaInicio, competenciaFim);

  for (const periodo of competencias) {
    const parsed = parsePeriodo(periodo);
    if (!parsed) continue;

    const { data: jaExiste } = await supabase
      .from("credito_conexao_faturas")
      .select("id")
      .eq("conta_conexao_id", contaConexaoId)
      .eq("periodo_referencia", periodo)
      .maybeSingle();

    if (jaExiste?.id) continue;

    const dataFechamento = buildDateFromYMD(parsed.year, parsed.month, diaFechamento);
    const dataVenc = diaVencimento ? buildDateFromYMD(parsed.year, parsed.month, diaVencimento) : null;

    const { error } = await supabase.from("credito_conexao_faturas").insert({
      conta_conexao_id: contaConexaoId,
      periodo_referencia: periodo,
      data_fechamento: dataFechamento,
      data_vencimento: dataVenc,
      valor_total_centavos: 0,
      status: "ABERTA",
    });

    if (error) {
      throw new Error(`falha_criar_fatura_credito_conexao: ${error.message}`);
    }
  }
}

async function vincularLancamentoNaFatura(params: {
  supabase: any;
  contaConexaoId: number;
  periodoReferencia: string;
  lancamentoId: number;
  valorCentavos: number;
}) {
  const { supabase, contaConexaoId, periodoReferencia, lancamentoId, valorCentavos } = params;

  const { data: fatura, error: errFat } = await supabase
    .from("credito_conexao_faturas")
    .select("id, valor_total_centavos")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("periodo_referencia", periodoReferencia)
    .single();

  if (errFat || !fatura) {
    throw new Error(`fatura_nao_encontrada_para_periodo: ${periodoReferencia}`);
  }

  const { error: errLink } = await supabase.from("credito_conexao_fatura_lancamentos").insert({
    fatura_id: fatura.id,
    lancamento_id: lancamentoId,
  });

  if (errLink) {
    throw new Error(`falha_vincular_lancamento_fatura: ${errLink.message}`);
  }

  const novoTotal = (Number(fatura.valor_total_centavos) || 0) + valorCentavos;

  const { error: errUpd } = await supabase
    .from("credito_conexao_faturas")
    .update({ valor_total_centavos: novoTotal })
    .eq("id", fatura.id);

  if (errUpd) {
    throw new Error(`falha_atualizar_total_fatura: ${errUpd.message}`);
  }
}

type ExecucaoManualResumo = {
  turma_id: number;
  nivel: string | null;
  valor_mensal_centavos: number;
  modelo_liquidacao: "FAMILIA" | "MOVIMENTO" | "BOLSA";
  movimento_concessao_id: string | null;
};

function parseOrigemValorExecucao(origemValor: string | null): {
  modelo_liquidacao: "FAMILIA" | "MOVIMENTO" | "BOLSA";
  movimento_concessao_id: string | null;
} {
  if (!origemValor) {
    return { modelo_liquidacao: "FAMILIA", movimento_concessao_id: null };
  }
  const raw = origemValor.trim().toUpperCase();
  if (raw.startsWith("MANUAL|MOVIMENTO")) {
    const partes = origemValor.split("|");
    const concessaoRaw = partes.length >= 3 ? partes[2] : null;
    return {
      modelo_liquidacao: "MOVIMENTO",
      movimento_concessao_id: asUuidOrNull(concessaoRaw),
    };
  }
  if (raw.startsWith("MANUAL|BOLSA")) {
    return { modelo_liquidacao: "BOLSA", movimento_concessao_id: null };
  }
  if (raw.startsWith("MANUAL_MOVIMENTO")) {
    const partes = origemValor.split(":");
    const concessaoRaw = partes.length >= 2 ? partes[1] : null;
    return {
      modelo_liquidacao: "MOVIMENTO",
      movimento_concessao_id: asUuidOrNull(concessaoRaw),
    };
  }
  return { modelo_liquidacao: "FAMILIA", movimento_concessao_id: null };
}

function normalizeExecucoesManuais(
  rows: unknown[],
  defaultModelo: "FAMILIA" | "MOVIMENTO" | "BOLSA",
  defaultConcessaoId: string | null,
): ExecucaoManualResumo[] {
  return (rows ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const turmaId = asInt(record.turma_id);
      const valor = asInt(record.valor_mensal_centavos);
      if (!turmaId || valor === null || valor < 0) return null;
      const nivel = typeof record.nivel === "string" ? record.nivel.trim() : null;
      const origemValor = typeof record.origem_valor === "string" ? record.origem_valor : null;
      const origemParsed = parseOrigemValorExecucao(origemValor);
      const modeloDireto = typeof record.modelo_liquidacao === "string" ? record.modelo_liquidacao.trim().toUpperCase() : "";
      const modelo =
        modeloDireto === "MOVIMENTO" || origemParsed.modelo_liquidacao === "MOVIMENTO"
          ? "MOVIMENTO"
          : modeloDireto === "BOLSA" || origemParsed.modelo_liquidacao === "BOLSA"
            ? "BOLSA"
            : defaultModelo;
      const concessaoDireta = asUuidOrNull(record.movimento_concessao_id);
      const concessao =
        concessaoDireta ?? origemParsed.movimento_concessao_id ?? (modelo === "MOVIMENTO" ? defaultConcessaoId : null);
      return {
        turma_id: turmaId,
        nivel,
        valor_mensal_centavos: valor,
        modelo_liquidacao: modelo,
        movimento_concessao_id: concessao,
      };
    })
    .filter((row): row is ExecucaoManualResumo => !!row);
}

function parsePeriodo(value: string | null): { year: number; month: number } | null {
  if (!value) return null;
  const raw = value.length >= 7 ? value.slice(0, 7) : value;
  if (!/^\d{4}-\d{2}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function shiftPeriodo(periodo: string, deltaMeses: number): string | null {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return null;
  let year = parsed.year;
  let month = parsed.month + deltaMeses;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return buildPeriodo(year, month);
}

function buildCompetenciasBetween(inicio: string, fim: string): string[] {
  const start = parsePeriodo(inicio);
  const end = parsePeriodo(fim);
  if (!start || !end) return [];
  const out: string[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    out.push(buildPeriodo(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

function resolveCompetenciaMensalidade(dataBase: string | null, cutoffDia: number = DIA_CORTE_PRORATA): {
  competenciaBase: string;
  competenciaMensalidade: string;
  diaBase: number;
} {
  const base = dataBase ?? new Date().toISOString().slice(0, 10);
  const competenciaBase = ymFromDate(base);
  const diaBase = Number(base.slice(8, 10));
  const usaMesSeguinte = Number.isFinite(diaBase) && diaBase > cutoffDia;
  const competenciaMensalidade = usaMesSeguinte ? shiftPeriodo(competenciaBase, 1) ?? competenciaBase : competenciaBase;
  return { competenciaBase, competenciaMensalidade, diaBase };
}

function normalizeCompetenciaFim(competenciaInicio: string, competenciaFim: string): string {
  const inicio = parsePeriodo(competenciaInicio);
  const fim = parsePeriodo(competenciaFim);
  if (!inicio || !fim) return competenciaFim;
  if (fim.year < inicio.year || (fim.year === inicio.year && fim.month < inicio.month)) {
    return competenciaInicio;
  }
  return competenciaFim;
}

function clampDiaVencimento(year: number, month: number, day: number): number {
  const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Number.isFinite(day) ? Math.trunc(day) : 12;
  if (safeDay <= 0) return Math.min(12, ultimoDia);
  return Math.min(safeDay, ultimoDia);
}

async function gerarCobrancasCartaoManual(params: {
  supabase: SupabaseAdminClient;
  contaConexaoId: number;
  pessoaId: number;
  matriculaId: number;
  alunoId: number;
  execucoes: ExecucaoManualResumo[];
  totalCentavos: number;
  competenciaInicio: string;
  competenciaFim: string;
  diaVencimento: number;
}): Promise<{ cobrancas: Array<{ id: number; competencia_ano_mes: string }>; lancamentos: number }> {
  const {
    supabase,
    contaConexaoId,
    pessoaId,
    matriculaId,
    alunoId,
    execucoes,
    totalCentavos,
    competenciaInicio,
    competenciaFim,
    diaVencimento,
  } = params;

  const competencias = buildCompetenciasBetween(competenciaInicio, competenciaFim);
  const cobrancas: Array<{ id: number; competencia_ano_mes: string }> = [];
  let lancamentos = 0;

  for (const competencia of competencias) {
    const parsed = parsePeriodo(competencia);
    if (!parsed) continue;
    const vencimento = buildDateFromYMD(
      parsed.year,
      parsed.month,
      clampDiaVencimento(parsed.year, parsed.month, diaVencimento),
    );

    const descricao = `Mensalidade ${competencia} - matricula`;
    const cobrancaId = await ensureCobrancaCartaoConexao({
      supabase,
      pessoaId,
      matriculaId,
      competencia,
      valorCentavos: totalCentavos,
      vencimento,
      descricao,
    });

    const composicaoJson = {
      fonte: "MATRICULA_MANUAL",
      aluno_pessoa_id: alunoId,
      responsavel_financeiro_id: pessoaId,
      competencia,
      total_centavos: totalCentavos,
      itens: execucoes.map((execucao) => ({
        turma_id: execucao.turma_id,
        descricao: execucao.nivel ? `Nivel ${execucao.nivel}` : `Turma ${execucao.turma_id}`,
        valor_centavos: execucao.valor_mensal_centavos,
      })),
    };

    const lancamento = await upsertLancamentoPorCobranca({
      cobrancaId,
      contaConexaoId,
      competencia,
      valorCentavos: totalCentavos,
      descricao,
      origemSistema: "MATRICULA",
      origemId: matriculaId,
      composicaoJson,
    });

    lancamentos += 1;

    await vincularLancamentoNaFatura({
      supabase,
      contaConexaoId,
      periodoReferencia: competencia,
      lancamentoId: lancamento.id,
      valorCentavos: totalCentavos,
    });

    const ledgerLinha: LedgerInsert = {
      matricula_id: matriculaId,
      tipo: "LANCAMENTO_CREDITO",
      descricao,
      valor_centavos: totalCentavos,
      vencimento: null,
      data_evento: dateFromPeriodo(competencia),
      status: "PENDENTE_FATURA",
      origem_tabela: "credito_conexao_lancamentos",
      origem_id: lancamento.id,
    };

    const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerLinha);
    if (ledgerErr) {
      throw new Error(`falha_inserir_ledger: ${ledgerErr.message}`);
    }

    cobrancas.push({ id: cobrancaId, competencia_ano_mes: competencia });
  }

  return { cobrancas, lancamentos };
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const cookieHeader = request.headers.get("cookie") ?? "";

  const supabase = getSupabaseAdmin();

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const matriculaId = asInt(body.matricula_id);
  if (!matriculaId) {
    return NextResponse.json({ error: "matricula_id_invalido" }, { status: 400 });
  }

  if (!body.tipo_primeira_cobranca) {
    return NextResponse.json({ error: "tipo_primeira_cobranca_obrigatorio" }, { status: 400 });
  }

  if (!body.modo) {
    return NextResponse.json({ error: "modo_obrigatorio" }, { status: 400 });
  }

  // 1) Carrega matricula (inclui valor herdado, metodo de liquidacao e vinculo institucional)
  const fetched = await fetchMatriculaById({ supabase, matriculaId });
  if (!fetched.matricula) {
    if (fetched.errorMessage) {
      return NextResponse.json({ error: "falha_buscar_matricula", details: fetched.errorMessage }, { status: 500 });
    }
    return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
  }

  const matricula = fetched.matricula;
  const alunoId = matricula.pessoa_id;
  const metodoLiquidacao = matricula.metodo_liquidacao;
  const movimentoConcessaoId = matricula.movimento_concessao_id;

  const debugCartao: {
    executado: boolean;
    conta_conexao_id?: number;
    ano_ref?: number;
    data_inicio_vinculo?: string | null;
    periodo_inicio?: string | null;
    periodo_fim?: string | null;
    total_mensalidade_centavos?: number;
    itens?: ComposicaoItem[];
    created_lancamentos: number;
    linked_faturas: number;
    erro?: string;
  } = {
    executado: false,
    created_lancamentos: 0,
    linked_faturas: 0,
    data_inicio_vinculo: null,
    periodo_inicio: null,
    periodo_fim: null,
  };

  debugCartao.data_inicio_vinculo = matricula.data_inicio_vinculo;

  const primeiraStatus = (matricula.primeira_cobranca_status ?? "").toUpperCase();
  if (metodoLiquidacao === "CREDITO_BOLSA" && primeiraStatus === "LIQUIDADO_INSTITUCIONAL") {
    return NextResponse.json({
      ok: true,
      modo: "MOVIMENTO",
      status: "JA_LIQUIDADO",
      matricula_id: matricula.id,
    });
  }

  if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO", "LIQUIDADO_INSTITUCIONAL"].includes(primeiraStatus)) {
    return NextResponse.json({ error: "matricula_ja_liquidada" }, { status: 409 });
  }

  const vinculoId = matricula.vinculo_id;
  const dataInicio = matricula.data_inicio_vinculo ?? matricula.data_matricula ?? null;

  const { data: execRows, error: execErr } = await supabase
    .from("matricula_execucao_valores")
    .select("turma_id, nivel, valor_mensal_centavos, origem_valor")
    .eq("matricula_id", matriculaId)
    .eq("ativo", true);

  if (execErr) {
    return NextResponse.json({ error: "falha_buscar_execucoes", details: execErr.message }, { status: 500 });
  }

  const defaultModeloExecucao = metodoLiquidacao === "CREDITO_BOLSA" ? "BOLSA" : "FAMILIA";
  const execucoesManuais = normalizeExecucoesManuais(
    execRows ?? [],
    defaultModeloExecucao,
    movimentoConcessaoId,
  );
  const modoManual = execucoesManuais.length > 0;
  const execucoesFamilia = execucoesManuais.filter((execucao) => execucao.modelo_liquidacao === "FAMILIA");
  const execucoesMovimento = execucoesManuais.filter((execucao) => execucao.modelo_liquidacao === "MOVIMENTO");
  const execucoesBolsa = execucoesManuais.filter((execucao) => execucao.modelo_liquidacao === "BOLSA");
  const totalFamiliaManual = execucoesFamilia.reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0);
  const totalMovimentoManual = execucoesMovimento.reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0);
  const totalBolsaManual = execucoesBolsa.reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0);
  const totalInstitucionalManual = totalMovimentoManual + totalBolsaManual;
  const turmasFamilia = Array.from(new Set(execucoesFamilia.map((execucao) => execucao.turma_id)));
  let cobrancasCriadasManual: Array<{ id: number; competencia_ano_mes: string }> = [];
  const gerarMensalidadesCartao = async (): Promise<
    | {
        cobrancasCriadasManual: Array<{ id: number; competencia_ano_mes: string }>;
        totalMensalidadeCentavos: number;
      }
    | NextResponse
  > => {
    debugCartao.executado = true;
    let cobrancasGeradas: Array<{ id: number; competencia_ano_mes: string }> = [];
    let totalMensalidade = 0;

    try {
      if (modoManual) {
        if (!totalFamiliaManual || totalFamiliaManual <= 0 || execucoesFamilia.length === 0) {
          return {
            cobrancasCriadasManual: [],
            totalMensalidadeCentavos: 0,
          };
        }

        const { competenciaMensalidade } = resolveCompetenciaMensalidade(dataInicio);
        const competenciaInicio = competenciaMensalidade;

        let competenciaFim = competenciaInicio;
        const turmaReferencia = vinculoId ?? turmasFamilia[0] ?? null;

        if (turmaReferencia) {
          const { data: turmaRef, error: turmaErr } = await supabase
            .from("turmas")
            .select("periodo_letivo_id")
            .eq("turma_id", turmaReferencia)
            .maybeSingle();

          if (turmaErr) {
            throw new Error(`falha_buscar_turma: ${turmaErr.message}`);
          }

          const periodoLetivoId = asInt((turmaRef as { periodo_letivo_id?: unknown })?.periodo_letivo_id);
          if (periodoLetivoId) {
            const { data: periodo, error: periodoErr } = await supabase
              .from("periodos_letivos")
              .select("data_fim")
              .eq("id", periodoLetivoId)
              .maybeSingle();

            if (periodoErr) {
              throw new Error(`falha_buscar_periodo_letivo: ${periodoErr.message}`);
            }

            const dataFim = asDateStr((periodo as { data_fim?: unknown })?.data_fim);
            if (dataFim) {
              const fim = ymFromDate(dataFim);
              competenciaFim = fim < competenciaInicio ? competenciaInicio : fim;
            }
          }
        }

        debugCartao.periodo_inicio = competenciaInicio;
        debugCartao.periodo_fim = competenciaFim;
        debugCartao.total_mensalidade_centavos = totalFamiliaManual;
        debugCartao.itens = execucoesFamilia.map((execucao) => ({
          turma_id: execucao.turma_id,
          ue_id: null,
          descricao: execucao.nivel ? `Nivel ${execucao.nivel}` : `Turma ${execucao.turma_id}`,
          valor_centavos: execucao.valor_mensal_centavos,
        }));

        const conta = await ensureContaCreditoConexaoAluno({
          supabase,
          pessoaTitularId: matricula.responsavel_financeiro_id,
        });

        debugCartao.conta_conexao_id = conta.id;

        await ensureFaturasPeriodo({
          supabase,
          contaConexaoId: conta.id,
          competenciaInicio,
          competenciaFim,
          diaFechamento: conta.dia_fechamento ?? 10,
          diaVencimento: conta.dia_vencimento ?? 12,
        });

        const resultado = await gerarCobrancasCartaoManual({
          supabase,
          contaConexaoId: conta.id,
          pessoaId: matricula.responsavel_financeiro_id,
          matriculaId: matricula.id,
          alunoId,
          execucoes: execucoesFamilia,
          totalCentavos: totalFamiliaManual,
          competenciaInicio,
          competenciaFim,
          diaVencimento: conta.dia_vencimento ?? 12,
        });

        cobrancasGeradas = resultado.cobrancas;
        debugCartao.created_lancamentos += resultado.lancamentos;
        debugCartao.linked_faturas += resultado.lancamentos;
        totalMensalidade = totalFamiliaManual;
      } else {
        const inicioVinculo = debugCartao.data_inicio_vinculo;
        const anoRef =
          typeof matricula.ano_referencia === "number"
            ? matricula.ano_referencia
            : inicioVinculo
              ? yearFromDate(inicioVinculo)
              : new Date().getFullYear();

        debugCartao.ano_ref = anoRef;

        const { competenciaMensalidade } = resolveCompetenciaMensalidade(inicioVinculo ?? dataInicio);
        let competenciaFim = buildPeriodo(anoRef, 12);
        competenciaFim = normalizeCompetenciaFim(competenciaMensalidade, competenciaFim);

        debugCartao.periodo_inicio = competenciaMensalidade;
        debugCartao.periodo_fim = competenciaFim;

        const composicao = await montarComposicaoMensalidade({
          supabase,
          request,
          cookieHeader,
          matriculaId: matricula.id,
          alunoId,
          anoRef,
        });

        totalMensalidade = composicao.totalCentavos;
        debugCartao.total_mensalidade_centavos = totalMensalidade;
        debugCartao.itens = composicao.itens;

        if (!totalMensalidade || totalMensalidade <= 0) {
          console.warn(
            "[matriculas/liquidacao] totalMensalidade ausente para lancamento no cartao. Matricula:",
            matricula.id,
          );
        } else {
          const conta = await ensureContaCreditoConexaoAluno({
            supabase,
            pessoaTitularId: matricula.responsavel_financeiro_id,
          });

          debugCartao.conta_conexao_id = conta.id;

          await ensureFaturasPeriodo({
            supabase,
            contaConexaoId: conta.id,
            competenciaInicio: competenciaMensalidade,
            competenciaFim,
            diaFechamento: conta.dia_fechamento ?? 10,
            diaVencimento: conta.dia_vencimento ?? 12,
          });

          const composicaoBase = {
            fonte: "MATRICULA_MULTIPLA_UE",
            aluno_pessoa_id: alunoId,
            responsavel_financeiro_id: matricula.responsavel_financeiro_id,
            ano_referencia: anoRef,
            total_centavos: totalMensalidade,
            itens: composicao.itens,
          };

          const competencias = buildCompetenciasBetween(competenciaMensalidade, competenciaFim);

          for (const periodo of competencias) {
            const parsed = parsePeriodo(periodo);
            if (!parsed) continue;
            const dataEvento = buildDateFromYMD(parsed.year, parsed.month, 1);
            const vencimento = buildDateFromYMD(parsed.year, parsed.month, conta.dia_vencimento ?? 12);
            const descricao = `Mensalidade ${periodo} - matricula`;

            const cobrancaId = await ensureCobrancaCartaoConexao({
              supabase,
              pessoaId: matricula.responsavel_financeiro_id,
              matriculaId: matricula.id,
              competencia: periodo,
              valorCentavos: totalMensalidade,
              vencimento,
              descricao,
            });

            const lancamento = await upsertLancamentoPorCobranca({
              cobrancaId,
              contaConexaoId: Number(conta.id),
              competencia: periodo,
              valorCentavos: totalMensalidade,
              descricao,
              origemSistema: "MATRICULA",
              origemId: matricula.id,
              composicaoJson: { ...composicaoBase, competencia: periodo },
            });

            debugCartao.created_lancamentos += 1;

            await vincularLancamentoNaFatura({
              supabase,
              contaConexaoId: conta.id,
              periodoReferencia: periodo,
              lancamentoId: lancamento.id,
              valorCentavos: totalMensalidade,
            });

            debugCartao.linked_faturas += 1;

            const ledgerLinha: LedgerInsert = {
              matricula_id: matricula.id,
              tipo: "LANCAMENTO_CREDITO",
              descricao,
              valor_centavos: totalMensalidade,
              vencimento: null,
              data_evento: dataEvento,
              status: "PENDENTE_FATURA",
              origem_tabela: "credito_conexao_lancamentos",
              origem_id: lancamento.id,
            };

            const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerLinha);
            if (ledgerErr) {
              return NextResponse.json(
                { error: "falha_inserir_ledger", details: ledgerErr.message },
                { status: 500 },
              );
            }
          }
        }
      }
    } catch (err) {
      debugCartao.erro = err instanceof Error ? err.message : "erro_desconhecido";
      return NextResponse.json({ error: "falha_cartao_conexao", debugCartao }, { status: 500 });
    }

    return {
      cobrancasCriadasManual: cobrancasGeradas,
      totalMensalidadeCentavos: totalMensalidade,
    };
  };

  try {
    await ensureTurmaAlunoVinculos({
      supabase,
      matriculaId: matricula.id,
      alunoId,
      vinculoId,
      dataInicio,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_criar_turma_aluno", details: msg }, { status: 500 });
  }

  const valorPayload = asInt(body.valor_centavos);
  const valorHerdado = asInt(matricula.primeira_cobranca_valor_centavos);
  const valorTotalMatricula = asInt(matricula.total_mensalidade_centavos);
  const valorFinal =
    valorPayload && valorPayload > 0
      ? valorPayload
      : modoManual
        ? totalFamiliaManual > 0
          ? totalFamiliaManual
          : null
        : valorHerdado && valorHerdado > 0
          ? valorHerdado
          : null;

  type MovimentoRegistroResumo = {
    concessao_id: string;
    beneficiario_id: string;
    ciclo_id: string;
    competencia: string;
    valor_centavos: number;
    turmas: number[];
  };

  const registrarParteMovimento = async (valorInstitucional: number) => {
    const grupos = new Map<string, { valor_centavos: number; turmas: number[] }>();
    const semConcessao: Array<{ turma_id: number; valor_centavos: number }> = [];

    if (execucoesMovimento.length > 0) {
      for (const execucao of execucoesMovimento) {
        const concessaoId = execucao.movimento_concessao_id ?? movimentoConcessaoId;
        if (!concessaoId) {
          semConcessao.push({ turma_id: execucao.turma_id, valor_centavos: execucao.valor_mensal_centavos });
          continue;
        }
        const atual = grupos.get(concessaoId);
        if (!atual) {
          grupos.set(concessaoId, {
            valor_centavos: execucao.valor_mensal_centavos,
            turmas: [execucao.turma_id],
          });
        } else {
          atual.valor_centavos += execucao.valor_mensal_centavos;
          if (!atual.turmas.includes(execucao.turma_id)) atual.turmas.push(execucao.turma_id);
        }
      }
    } else {
      if (!movimentoConcessaoId) {
        const dataLiquidacao = new Date().toISOString().slice(0, 10);
        const linhaInstitucional: LedgerInsert = {
          matricula_id: matricula.id,
          tipo: "OUTRO",
          descricao: "Liquidacao institucional - Projeto Social",
          valor_centavos: valorInstitucional,
          vencimento: null,
          data_evento: dataLiquidacao,
          status: "PAGO",
          origem_tabela: "bolsa_concessoes",
          origem_id: null,
        };
        const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(linhaInstitucional);
        if (ledgerErr) {
          return NextResponse.json({ error: "falha_inserir_ledger", details: ledgerErr.message }, { status: 500 });
        }
        return {
          ok: true as const,
          registros: [] as MovimentoRegistroResumo[],
          dataLiquidacao,
        };
      }
      grupos.set(movimentoConcessaoId, { valor_centavos: valorInstitucional, turmas: [] });
    }

    const registrosMovimento: MovimentoRegistroResumo[] = [];
    for (const [concessaoId, grupo] of grupos.entries()) {
      const registroMov = await registrarConsumoInstitucionalMovimento({
        supabase,
        matriculaId: matricula.id,
        pessoaId: alunoId,
        movimentoConcessaoId: concessaoId,
        userId: auth.user.id,
        valorCentavos: grupo.valor_centavos,
        tipoPrimeira: body.tipo_primeira_cobranca,
      });

      if (!registroMov.ok) {
        return NextResponse.json(
          { error: registroMov.error, details: registroMov.details ?? null },
          { status: registroMov.status },
        );
      }

      registrosMovimento.push({
        concessao_id: registroMov.concessao_id,
        beneficiario_id: registroMov.beneficiario_id,
        ciclo_id: registroMov.ciclo_id,
        competencia: registroMov.competencia,
        valor_centavos: grupo.valor_centavos,
        turmas: grupo.turmas,
      });
    }

    const dataLiquidacao = new Date().toISOString().slice(0, 10);
    const totalSemConcessao = semConcessao.reduce((acc, row) => acc + row.valor_centavos, 0);
    const registroPorConcessao = new Map<string, MovimentoRegistroResumo>();
    for (const registro of registrosMovimento) registroPorConcessao.set(registro.concessao_id, registro);

    const linhasMovimento: LedgerInsert[] =
      execucoesMovimento.length > 0
        ? execucoesMovimento.map((execucao) => {
            const concessaoId = execucao.movimento_concessao_id ?? movimentoConcessaoId ?? "";
            const registro = registroPorConcessao.get(concessaoId) ?? registrosMovimento[0];
            const cicloIdAsInt = registro ? asInt(registro.ciclo_id) : null;
            const competencia = registro?.competencia ?? new Date().toISOString().slice(0, 7);
            return {
              matricula_id: matricula.id,
              tipo: "OUTRO",
              descricao: `Liquidacao institucional - Movimento (turma ${execucao.turma_id}, concessao ${concessaoId.slice(0, 8)}..., competencia ${competencia})`,
              valor_centavos: execucao.valor_mensal_centavos,
              vencimento: null,
              data_evento: dataLiquidacao,
              status: "PAGO",
              origem_tabela: "movimento_concessoes_ciclos",
              origem_id: cicloIdAsInt ?? null,
            };
          }).concat(
            semConcessao.map((execucao) => ({
              matricula_id: matricula.id,
              tipo: "OUTRO",
              descricao: `Liquidacao institucional - Projeto Social (turma ${execucao.turma_id})`,
              valor_centavos: execucao.valor_centavos,
              vencimento: null,
              data_evento: dataLiquidacao,
              status: "PAGO",
              origem_tabela: "bolsa_concessoes",
              origem_id: null,
            })),
          )
        : registrosMovimento.map((registro) => ({
            matricula_id: matricula.id,
            tipo: "OUTRO",
            descricao: `Liquidacao institucional - Movimento (concessao ${registro.concessao_id.slice(0, 8)}..., competencia ${registro.competencia})`,
            valor_centavos: registro.valor_centavos,
            vencimento: null,
            data_evento: dataLiquidacao,
            status: "PAGO",
            origem_tabela: "movimento_concessoes_ciclos",
            origem_id: asInt(registro.ciclo_id) ?? null,
          }));

    if (execucoesMovimento.length === 0 && totalSemConcessao > 0) {
      linhasMovimento.push({
        matricula_id: matricula.id,
        tipo: "OUTRO",
        descricao: "Liquidacao institucional - Projeto Social",
        valor_centavos: totalSemConcessao,
        vencimento: null,
        data_evento: dataLiquidacao,
        status: "PAGO",
        origem_tabela: "bolsa_concessoes",
        origem_id: null,
      });
    }

    const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(linhasMovimento);
    if (ledgerErr) {
      return NextResponse.json({ error: "falha_inserir_ledger", details: ledgerErr.message }, { status: 500 });
    }

    return {
      ok: true as const,
      registros: registrosMovimento,
      dataLiquidacao,
    };
  };

  const somenteMovimentoNoManual = modoManual && execucoesMovimento.length > 0 && execucoesFamilia.length === 0;
  if (metodoLiquidacao === "CREDITO_BOLSA" || somenteMovimentoNoManual) {
    const valorInstitucional =
      totalInstitucionalManual > 0
        ? totalInstitucionalManual
        : valorPayload && valorPayload > 0
          ? valorPayload
          : valorTotalMatricula && valorTotalMatricula > 0
            ? valorTotalMatricula
            : null;

    if (!valorInstitucional) {
      return NextResponse.json({ error: "valor_institucional_nao_resolvido" }, { status: 409 });
    }

    const movimentoRes = await registrarParteMovimento(valorInstitucional);
    if (movimentoRes instanceof NextResponse) return movimentoRes;

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "LIQUIDADO_INSTITUCIONAL",
        primeira_cobranca_valor_centavos: valorInstitucional,
        primeira_cobranca_cobranca_id: null,
        primeira_cobranca_recebimento_id: null,
        primeira_cobranca_forma_pagamento_id: null,
        primeira_cobranca_data_pagamento: movimentoRes.dataLiquidacao,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      modo: "MOVIMENTO",
      status: "LIQUIDADO_INSTITUCIONAL",
      matricula_id: matricula.id,
      valor_centavos: valorInstitucional,
      movimento: movimentoRes.registros[0] ?? null,
      movimento_registros: movimentoRes.registros,
    });
  }

  if (body.modo === "PAGAR_AGORA") {
    const formaPagamentoId = asInt(body.forma_pagamento_id);
    const dataPg = asDateStr(body.data_pagamento);

    if (!formaPagamentoId) {
      return NextResponse.json({ error: "forma_pagamento_id_obrigatorio" }, { status: 400 });
    }
    if (!valorFinal) {
      return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
    }
    if (!dataPg) {
      return NextResponse.json({ error: "data_pagamento_obrigatoria" }, { status: 400 });
    }

    const { data: forma, error: errForma } = await supabase
      .from("formas_pagamento")
      .select("id, codigo, nome")
      .eq("id", formaPagamentoId)
      .single();

    if (errForma || !forma?.codigo) {
      return NextResponse.json({ error: "forma_pagamento_invalida" }, { status: 400 });
    }

    const { data: cobranca, error: errCobr } = await supabase
      .from("cobrancas")
      .insert({
        pessoa_id: matricula.responsavel_financeiro_id,
        descricao: "Entrada (pro-rata) - ato da matricula",
        valor_centavos: valorFinal,
        vencimento: dataPg,
        status: "PAGA",
        data_pagamento: dataPg,
        metodo_pagamento: forma.codigo,
        observacoes: body.observacoes ?? null,
        origem_tipo: "MATRICULA",
        origem_id: matricula.id,
      })
      .select("id, centro_custo_id")
      .single();

    if (errCobr || !cobranca) {
      return NextResponse.json(
        { error: "falha_criar_cobranca", details: errCobr?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    const { data: receb, error: errRec } = await supabase
      .from("recebimentos")
      .insert({
        cobranca_id: cobranca.id,
        centro_custo_id: cobranca.centro_custo_id ?? null,
        valor_centavos: valorFinal,
        data_pagamento: toTimestamptzNoonUtc(dataPg),
        metodo_pagamento: forma.codigo,
        origem_sistema: "MATRICULA",
        observacoes: body.observacoes ?? null,
        forma_pagamento_codigo: forma.codigo,
      })
      .select("id")
      .single();

    if (errRec || !receb) {
      return NextResponse.json(
        { error: "falha_criar_recebimento", details: errRec?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    await inserirMovimentoFinanceiroReceita({
      supabase,
      centroCustoId: cobranca.centro_custo_id ?? null,
      valorCentavos: valorFinal,
      dataYYYYMMDD: dataPg,
      origemTipo: "RECEBIMENTO",
      origemId: receb.id,
      descricao: "Pagamento presencial - Entrada (pro-rata) matricula",
    });

    if (body.tipo_primeira_cobranca === "ENTRADA_PRORATA") {
      const ledgerEntrada: LedgerInsert = {
        matricula_id: matricula.id,
        tipo: "ENTRADA",
        descricao: "Entrada / Pro-rata",
        valor_centavos: valorFinal,
        vencimento: null,
        data_evento: dataPg,
        status: "PAGO",
        origem_tabela: "recebimentos",
        origem_id: receb.id,
      };

      const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerEntrada);
      if (ledgerErr) {
        return NextResponse.json(
          { error: "falha_inserir_ledger", details: ledgerErr.message },
          { status: 500 },
        );
      }
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "PAGA",
        primeira_cobranca_valor_centavos: valorFinal,
        primeira_cobranca_cobranca_id: cobranca.id,
        primeira_cobranca_recebimento_id: receb.id,
        primeira_cobranca_forma_pagamento_id: formaPagamentoId,
        primeira_cobranca_data_pagamento: dataPg,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    if (body.tipo_primeira_cobranca === "ENTRADA_PRORATA" && totalFamiliaManual > 0) {
      const cartaoResultado = await gerarMensalidadesCartao();
      if (cartaoResultado instanceof NextResponse) {
        return cartaoResultado;
      }
      cobrancasCriadasManual = cartaoResultado.cobrancasCriadasManual;
    }

    let movimentoMeta: MovimentoRegistroResumo | null = null;
    let movimentoRegistros: MovimentoRegistroResumo[] = [];
    if (totalInstitucionalManual > 0) {
      const movimentoRes = await registrarParteMovimento(totalInstitucionalManual);
      if (movimentoRes instanceof NextResponse) return movimentoRes;
      movimentoMeta = movimentoRes.registros[0] ?? null;
      movimentoRegistros = movimentoRes.registros;
    }

    return NextResponse.json({
      ok: true,
      status: "PAGA",
      cobranca_id: cobranca.id,
      recebimento_id: receb.id,
      movimento: movimentoMeta,
      movimento_registros: movimentoRegistros,
      ...(modoManual
        ? {
            matricula_id: matricula.id,
            total_mensalidade_centavos: totalFamiliaManual,
            total_movimento_centavos: totalInstitucionalManual,
            turmas_ativadas: turmasFamilia,
            cobrancas_criadas: cobrancasCriadasManual,
          }
        : {}),
      debugCartao,
    });
  }

  if (body.modo === "LANCAR_NO_CARTAO") {
    const conta = await ensureContaCreditoConexaoAluno({
      supabase,
      pessoaTitularId: matricula.responsavel_financeiro_id,
    });

    if (modoManual) {
      if (!totalFamiliaManual || totalFamiliaManual <= 0 || execucoesFamilia.length === 0) {
        return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
      }

      const { competenciaMensalidade } = resolveCompetenciaMensalidade(dataInicio);
      const competenciaInicio = competenciaMensalidade;
      let competenciaFim = competenciaInicio;
      const turmaReferencia = vinculoId ?? turmasFamilia[0] ?? null;

      if (turmaReferencia) {
        const { data: turmaRef, error: turmaErr } = await supabase
          .from("turmas")
          .select("periodo_letivo_id")
          .eq("turma_id", turmaReferencia)
          .maybeSingle();

        if (turmaErr) {
          return NextResponse.json({ error: "falha_buscar_turma", details: turmaErr.message }, { status: 500 });
        }

        const periodoLetivoId = asInt((turmaRef as { periodo_letivo_id?: unknown })?.periodo_letivo_id);
        if (periodoLetivoId) {
          const { data: periodo, error: periodoErr } = await supabase
            .from("periodos_letivos")
            .select("data_fim")
            .eq("id", periodoLetivoId)
            .maybeSingle();

          if (periodoErr) {
            return NextResponse.json(
              { error: "falha_buscar_periodo_letivo", details: periodoErr.message },
              { status: 500 },
            );
          }

          const dataFim = asDateStr((periodo as { data_fim?: unknown })?.data_fim);
          if (dataFim) {
            const fim = ymFromDate(dataFim);
            competenciaFim = fim < competenciaInicio ? competenciaInicio : fim;
          }
        }
      }

      await ensureFaturasPeriodo({
        supabase,
        contaConexaoId: conta.id,
        competenciaInicio,
        competenciaFim,
        diaFechamento: conta.dia_fechamento ?? 10,
        diaVencimento: conta.dia_vencimento ?? 12,
      });

      const resultado = await gerarCobrancasCartaoManual({
        supabase,
        contaConexaoId: conta.id,
        pessoaId: matricula.responsavel_financeiro_id,
        matriculaId: matricula.id,
        alunoId,
        execucoes: execucoesFamilia,
        totalCentavos: totalFamiliaManual,
        competenciaInicio,
        competenciaFim,
        diaVencimento: conta.dia_vencimento ?? 12,
      });

      const { error: errUpd } = await supabase
        .from("matriculas")
        .update({
          primeira_cobranca_tipo: body.tipo_primeira_cobranca,
          primeira_cobranca_status: "LANCADA_CARTAO",
          primeira_cobranca_valor_centavos: totalFamiliaManual,
          primeira_cobranca_data_pagamento: null,
        })
        .eq("id", matricula.id);

      if (errUpd) {
        return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
      }

      let movimentoMeta: MovimentoRegistroResumo | null = null;
      let movimentoRegistros: MovimentoRegistroResumo[] = [];
      if (totalInstitucionalManual > 0) {
        const movimentoRes = await registrarParteMovimento(totalInstitucionalManual);
        if (movimentoRes instanceof NextResponse) return movimentoRes;
        movimentoMeta = movimentoRes.registros[0] ?? null;
        movimentoRegistros = movimentoRes.registros;
      }

      return NextResponse.json({
        ok: true,
        status: "LANCADA_CARTAO",
        matricula_id: matricula.id,
        total_mensalidade_centavos: totalFamiliaManual,
        total_movimento_centavos: totalInstitucionalManual,
        turmas_ativadas: turmasFamilia,
        cobrancas_criadas: resultado.cobrancas,
        movimento: movimentoMeta,
        movimento_registros: movimentoRegistros,
      });
    }

    const anoRef = typeof matricula.ano_referencia === "number" ? matricula.ano_referencia : new Date().getFullYear();
    const { competenciaMensalidade } = resolveCompetenciaMensalidade(dataInicio);
    const competenciaFim = normalizeCompetenciaFim(competenciaMensalidade, buildPeriodo(anoRef, 12));

    await ensureFaturasPeriodo({
      supabase,
      contaConexaoId: conta.id,
      competenciaInicio: competenciaMensalidade,
      competenciaFim,
      diaFechamento: conta.dia_fechamento ?? 10,
      diaVencimento: conta.dia_vencimento ?? 12,
    });

    const periodo = competenciaMensalidade;
    const parsedPeriodo = parsePeriodo(periodo);
    if (!parsedPeriodo) {
      return NextResponse.json({ error: "competencia_invalida" }, { status: 400 });
    }
    const vencimento = buildDateFromYMD(parsedPeriodo.year, parsedPeriodo.month, conta.dia_vencimento ?? 12);

    let composicao;
    try {
      composicao = await montarComposicaoMensalidade({
        supabase,
        request,
        cookieHeader,
        matriculaId: matricula.id,
        alunoId,
        anoRef,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro_desconhecido";
      return NextResponse.json({ error: "falha_composicao_cartao", details: msg }, { status: 500 });
    }

    const totalMensalidade = composicao.totalCentavos;
    if (!totalMensalidade || totalMensalidade <= 0) {
      return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
    }

    const cobrancaId = await ensureCobrancaCartaoConexao({
      supabase,
      pessoaId: matricula.responsavel_financeiro_id,
      matriculaId: matricula.id,
      competencia: periodo,
      valorCentavos: totalMensalidade,
      vencimento,
      descricao: "Mensalidade cheia - matricula",
    });

    let lancamentoId: number;
    try {
      const lancamento = await upsertLancamentoPorCobranca({
        cobrancaId,
        contaConexaoId: Number(conta.id),
        competencia: periodo,
        valorCentavos: totalMensalidade,
        descricao: "Mensalidade cheia - matricula",
        origemSistema: "MATRICULA",
        origemId: matricula.id,
        composicaoJson: {
          fonte: "MATRICULA_MULTIPLA_UE",
          aluno_pessoa_id: alunoId,
          responsavel_financeiro_id: matricula.responsavel_financeiro_id,
          ano_referencia: anoRef,
          competencia: periodo,
          total_centavos: totalMensalidade,
          itens: composicao.itens,
        },
      });
      lancamentoId = lancamento.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro_desconhecido";
      return NextResponse.json({ error: "falha_criar_lancamento_cartao", details: msg }, { status: 500 });
    }

    await vincularLancamentoNaFatura({
      supabase,
      contaConexaoId: conta.id,
      periodoReferencia: periodo,
      lancamentoId,
      valorCentavos: totalMensalidade,
    });

    const ledgerLinha: LedgerInsert = {
      matricula_id: matricula.id,
      tipo: "LANCAMENTO_CREDITO",
      descricao: "Mensalidade cheia - matricula",
      valor_centavos: totalMensalidade,
      vencimento: null,
      data_evento: dateFromPeriodo(periodo),
      status: "PENDENTE_FATURA",
      origem_tabela: "credito_conexao_lancamentos",
      origem_id: lancamentoId,
    };

    const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerLinha);
    if (ledgerErr) {
      return NextResponse.json(
        { error: "falha_inserir_ledger", details: ledgerErr.message },
        { status: 500 },
      );
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "LANCADA_CARTAO",
        primeira_cobranca_valor_centavos: totalMensalidade,
        primeira_cobranca_data_pagamento: null,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "LANCADA_CARTAO", lancamento_cartao_id: lancamentoId });
  }

  if (body.modo === "ADIAR_EXCECAO") {
    if (body.tipo_primeira_cobranca !== "ENTRADA_PRORATA") {
      return NextResponse.json({ error: "modo_invalido_para_tipo_cobranca" }, { status: 400 });
    }

    const motivo = typeof body.motivo_excecao === "string" ? body.motivo_excecao.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo_excecao_obrigatorio" }, { status: 400 });
    }

    if (!valorFinal) {
      return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
    }

    const vencimentoManual = asDateStr(body.vencimento_manual);
    if (!vencimentoManual) {
      return NextResponse.json({ error: "vencimento_manual_obrigatorio" }, { status: 400 });
    }
    const hoje = new Date().toISOString().slice(0, 10);
    if (vencimentoManual < hoje) {
      return NextResponse.json({ error: "vencimento_manual_invalido" }, { status: 400 });
    }

    const meioRaw = typeof body.meio_cobranca === "string" ? body.meio_cobranca.trim().toUpperCase() : "";
    const meioCobranca = meioRaw || "BOLETO";
    if (!["BOLETO", "FIMP"].includes(meioCobranca)) {
      return NextResponse.json({ error: "meio_cobranca_invalido" }, { status: 400 });
    }

    const { data: cobranca, error: errCobr } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .insert({
        pessoa_id: matricula.responsavel_financeiro_id,
        origem_tipo: "MATRICULA_ENTRADA",
        origem_id: matricula.id,
        valor_centavos: valorFinal,
        vencimento: vencimentoManual,
        status: "PENDENTE",
        meio: meioCobranca,
        motivo_excecao: motivo,
        observacao: body.observacoes ?? null,
      })
      .select("id")
      .single();

    if (errCobr || !cobranca) {
      return NextResponse.json(
        { error: "falha_criar_cobranca_avulsa", details: errCobr?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    const ledgerEntrada: LedgerInsert = {
      matricula_id: matricula.id,
      tipo: "ENTRADA",
      descricao: "Entrada / Pro-rata (adiada)",
      valor_centavos: valorFinal,
      vencimento: vencimentoManual,
      data_evento: vencimentoManual,
      status: "PENDENTE",
      origem_tabela: "financeiro_cobrancas_avulsas",
      origem_id: cobranca.id,
    };

    const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerEntrada);
    if (ledgerErr) {
      return NextResponse.json(
        { error: "falha_inserir_ledger", details: ledgerErr.message },
        { status: 500 },
      );
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "ADIADA_EXCECAO",
        primeira_cobranca_valor_centavos: valorFinal,
        primeira_cobranca_cobranca_id: cobranca.id,
        primeira_cobranca_recebimento_id: null,
        primeira_cobranca_forma_pagamento_id: null,
        primeira_cobranca_data_pagamento: null,
        excecao_primeiro_pagamento: true,
        motivo_excecao_primeiro_pagamento: motivo,
        excecao_autorizada_por: auth.user.id,
        excecao_criada_em: new Date().toISOString(),
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    const cartaoResultado = await gerarMensalidadesCartao();
    if (cartaoResultado instanceof NextResponse) {
      return cartaoResultado;
    }

    let movimentoMeta: MovimentoRegistroResumo | null = null;
    let movimentoRegistros: MovimentoRegistroResumo[] = [];
    if (totalInstitucionalManual > 0) {
      const movimentoRes = await registrarParteMovimento(totalInstitucionalManual);
      if (movimentoRes instanceof NextResponse) return movimentoRes;
      movimentoMeta = movimentoRes.registros[0] ?? null;
      movimentoRegistros = movimentoRes.registros;
    }

    return NextResponse.json({
      ok: true,
      modo: "EXCECAO_COBRANCA_AVULSA",
      cobranca_avulsa_id: cobranca.id,
      cartao_conta_id: debugCartao.conta_conexao_id ?? null,
      lancamentos_criados: debugCartao.created_lancamentos,
      movimento: movimentoMeta,
      movimento_registros: movimentoRegistros,
      ...(modoManual
        ? {
            total_mensalidade_centavos: cartaoResultado.totalMensalidadeCentavos,
            total_movimento_centavos: totalInstitucionalManual,
            turmas_ativadas: turmasFamilia,
            cobrancas_criadas: cartaoResultado.cobrancasCriadasManual,
          }
        : { total_mensalidade_centavos: cartaoResultado.totalMensalidadeCentavos }),
    });
  }

  return NextResponse.json({ error: "modo_invalido" }, { status: 400 });
}


