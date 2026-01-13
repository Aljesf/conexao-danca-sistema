import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type PlanoPagamentoMvp = {
  id: number;
  ativo: boolean;
  ciclo_cobranca: "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL" | null;
  numero_parcelas: number | null;
  termino_cobranca: "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA" | null;
  data_fim_manual: string | null;
  regra_total_devido: "PROPORCIONAL" | "FIXO" | null;
  permite_prorrata: boolean | null;
  ciclo_financeiro: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | null;
  forma_liquidacao_padrao: string | null;
};

type PoliticaPrimeiroPagamento = {
  modo: "PADRAO" | "ADIAR_PARA_VENCIMENTO";
  motivo_excecao?: string | null;
};

type ExecucaoManualIn = {
  turma_id: number;
  nivel?: string | null;
  nivel_id?: number | null;
  valor_mensal_centavos?: number | null;
};

type ExecucaoManual = {
  turma_id: number;
  nivel: string;
  nivel_id: number | null;
  valor_mensal_centavos: number;
};

type BodyNovo = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: TipoMatricula;
  vinculo_id: number;
  nivel_id?: number | null;
  vinculos_ids?: number[] | null;
  itens?: MatriculaItemIn[] | null;
  ano_referencia?: number | null;
  data_matricula?: string | null;
  data_inicio_vinculo?: string | null;
  escola_tabela_preco_curso_id?: number | null;
  plano_pagamento_id?: number | null;
  forma_liquidacao_padrao?: string | null;
  documento_modelo_id?: number | null;
  contrato_modelo_id?: number | null;
  observacoes?: string | null;
  total_mensalidade_centavos?: number | null;
  execucoes?: ExecucaoManualIn[] | null;
  politica_primeiro_pagamento?: PoliticaPrimeiroPagamento | null;
};

type MatriculaItemIn = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id?: number | null;
};

type MatriculaItem = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id: number;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}

function conflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "conflict", message, details: details ?? null }, { status: 409 });
}

function jsonError(
  error_code: string,
  error: unknown,
  status: number = 500,
  extra?: Record<string, unknown>,
) {
  const messageFromObject =
    error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : null;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : messageFromObject ?? "erro_interno";
  console.error(`[api/matriculas/novo] ${error_code}:`, message, extra ?? {});
  return NextResponse.json({ ok: false, error_code, error: message, ...(extra ?? {}) }, { status });
}

function serverError(error_code: string, message: string, details?: Record<string, unknown>) {
  return jsonError(error_code, message, 500, details ? { details } : undefined);
}

function parseDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function normalizeIdArray(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of value) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function parseItens(value: unknown): MatriculaItemIn[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const itens: MatriculaItemIn[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const servicoId = Number(record.servico_id);
    const unidadeExecucaoId = Number(record.unidade_execucao_id);
    if (!Number.isFinite(servicoId) || servicoId <= 0) return null;
    if (!Number.isFinite(unidadeExecucaoId) || unidadeExecucaoId <= 0) return null;
    const turmaRaw = record.turma_id;
    const turmaId = turmaRaw === undefined || turmaRaw === null ? null : Number(turmaRaw);
    if (turmaRaw !== undefined && turmaRaw !== null) {
      if (!Number.isFinite(turmaId) || (turmaId as number) <= 0) return null;
    }
    itens.push({
      servico_id: servicoId,
      unidade_execucao_id: unidadeExecucaoId,
      turma_id: Number.isFinite(turmaId as number) ? (turmaId as number) : null,
    });
  }
  return itens;
}

function parseExecucoes(value: unknown): ExecucaoManual[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const execucoes: ExecucaoManual[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const turmaId = Number(record.turma_id);
    if (!Number.isInteger(turmaId) || turmaId <= 0) return null;
    const valorRaw = record.valor_mensal_centavos ?? record.valor_mensal;
    const valor = Number(valorRaw);
    if (!Number.isFinite(valor) || !Number.isInteger(valor) || valor < 0) return null;
    const nivel = typeof record.nivel === "string" ? record.nivel.trim() : "";
    const nivelIdRaw = record.nivel_id;
    const nivelId = nivelIdRaw === undefined || nivelIdRaw === null ? null : Number(nivelIdRaw);
    if (nivelIdRaw !== undefined && nivelIdRaw !== null && (!Number.isInteger(nivelId) || nivelId <= 0)) return null;
    execucoes.push({
      turma_id: turmaId,
      nivel,
      nivel_id: Number.isInteger(nivelId) ? nivelId : null,
      valor_mensal_centavos: Math.trunc(valor),
    });
  }
  return execucoes;
}

function isExecucaoManual(x: unknown): x is ExecucaoManual {
  if (!x || typeof x !== "object") return false;
  const record = x as Record<string, unknown>;
  const turmaId = Number(record.turma_id);
  if (!Number.isFinite(turmaId) || turmaId <= 0) return false;
  const valorRaw = record.valor_mensal_centavos ?? record.valor_mensal;
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor)) return false;
  const nivelIdRaw = record.nivel_id;
  if (nivelIdRaw !== undefined && nivelIdRaw !== null && !Number.isFinite(Number(nivelIdRaw))) return false;
  if (typeof record.nivel !== "string" && (nivelIdRaw === undefined || nivelIdRaw === null)) return false;
  return true;
}

function parsePoliticaPrimeiroPagamento(value: unknown): PoliticaPrimeiroPagamento | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const modoRaw = typeof record.modo === "string" ? record.modo.trim().toUpperCase() : "PADRAO";
  if (modoRaw !== "PADRAO" && modoRaw !== "ADIAR_PARA_VENCIMENTO") return null;
  const motivo = typeof record.motivo_excecao === "string" ? record.motivo_excecao.trim() : null;
  return { modo: modoRaw as PoliticaPrimeiroPagamento["modo"], motivo_excecao: motivo };
}

function parseDateParts(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

type PrimeiraCobrancaCalc = {
  tipo: "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
  valor_centavos: number;
  ano_base: number;
  mes_base: number;
  mes_primeira_mensalidade: number;
};

function calcularPrimeiraCobranca(params: {
  totalCentavos: number;
  dataInicio: string | null;
  dataMatricula: string | null;
}): PrimeiraCobrancaCalc {
  const { totalCentavos, dataInicio, dataMatricula } = params;
  const hoje = new Date();
  const fallback = {
    year: hoje.getUTCFullYear(),
    month: hoje.getUTCMonth() + 1,
    day: hoje.getUTCDate(),
  };
  const dataBase = parseDateParts(dataInicio) ?? parseDateParts(dataMatricula) ?? fallback;
  const { year, month, day } = dataBase;
  const cutoffDia = 12;
  const inicioLetivoJaneiro = 12;

  if (month === 1) {
    if (day <= inicioLetivoJaneiro) {
      return {
        tipo: "MENSALIDADE_CHEIA_CARTAO",
        valor_centavos: Math.trunc(totalCentavos),
        ano_base: year,
        mes_base: month,
        mes_primeira_mensalidade: month,
      };
    }
    const baseDiasJaneiro = 31 - inicioLetivoJaneiro + 1;
    const diasRestantes = Math.max(0, 31 - day + 1);
    const valor = Math.round((totalCentavos * diasRestantes) / baseDiasJaneiro);
    return {
      tipo: "ENTRADA_PRORATA",
      valor_centavos: Math.max(0, valor),
      ano_base: year,
      mes_base: month,
      mes_primeira_mensalidade: Math.min(12, month + 1),
    };
  }

  if (day <= cutoffDia) {
    return {
      tipo: "MENSALIDADE_CHEIA_CARTAO",
      valor_centavos: Math.trunc(totalCentavos),
      ano_base: year,
      mes_base: month,
      mes_primeira_mensalidade: month,
    };
  }

  const ultimoDia = lastDayOfMonth(year, month);
  const diasRestantes = Math.max(0, ultimoDia - day + 1);
  const valor = Math.round((totalCentavos * diasRestantes) / 30);
  return {
    tipo: "ENTRADA_PRORATA",
    valor_centavos: Math.max(0, valor),
    ano_base: year,
    mes_base: month,
    mes_primeira_mensalidade: Math.min(12, month + 1),
  };
}

function buildPeriodo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function parsePeriodo(periodo: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return null;
  const year = Number(periodo.slice(0, 4));
  const month = Number(periodo.slice(5, 7));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
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

function buildDateFromYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function clampDiaVencimento(year: number, month: number, day: number): number {
  const ultimoDia = lastDayOfMonth(year, month);
  const safeDay = Number.isFinite(day) ? Math.trunc(day) : 12;
  if (safeDay <= 0) return Math.min(12, ultimoDia);
  return Math.min(safeDay, ultimoDia);
}

function ymFromDate(dateYYYYMMDD: string): string {
  return dateYYYYMMDD.slice(0, 7);
}

function proximoVencimento(diaVencimento: number, baseDate: string): string {
  const parts = parseDateParts(baseDate) ?? parseDateParts(new Date().toISOString().slice(0, 10));
  const safeDia = Math.min(28, Math.max(1, Math.trunc(diaVencimento)));
  if (!parts) {
    const now = new Date();
    return buildDateFromYMD(now.getUTCFullYear(), now.getUTCMonth() + 1, safeDia);
  }
  let year = parts.year;
  let month = parts.month;
  if (parts.day > safeDia) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const diaFinal = clampDiaVencimento(year, month, safeDia);
  return buildDateFromYMD(year, month, diaFinal);
}

async function ensureContaCreditoConexaoAluno(params: { supabase: SupabaseAdminClient; pessoaTitularId: number }) {
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

async function ensureFaturasAno(params: {
  supabase: SupabaseAdminClient;
  contaConexaoId: number;
  ano: number;
  diaFechamento: number;
  diaVencimento: number | null;
}) {
  const { supabase, contaConexaoId, ano, diaFechamento, diaVencimento } = params;

  for (let m = 1; m <= 12; m++) {
    const periodo = buildPeriodo(ano, m);

    const { data: jaExiste } = await supabase
      .from("credito_conexao_faturas")
      .select("id")
      .eq("conta_conexao_id", contaConexaoId)
      .eq("periodo_referencia", periodo)
      .maybeSingle();

    if (jaExiste?.id) continue;

    const dataFechamento = buildDateFromYMD(ano, m, diaFechamento);
    const dataVenc = diaVencimento ? buildDateFromYMD(ano, m, diaVencimento) : null;

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
  supabase: SupabaseAdminClient;
  contaConexaoId: number;
  periodoReferencia: string;
  lancamentoId: number;
}) {
  const { supabase, contaConexaoId, periodoReferencia, lancamentoId } = params;

  const { data: fatura, error: errFat } = await supabase
    .from("credito_conexao_faturas")
    .select("id")
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

export async function POST(req: Request) {
  try {
    const denied = await guardApiByRole(req as any);
    if (denied) return denied as any;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const admin = getSupabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: BodyNovo;
    try {
      body = (await req.json()) as BodyNovo;
    } catch {
      return badRequest("JSON invalido.");
    }

  const pessoaId = Number(body.pessoa_id);
  const respFinId = Number(body.responsavel_financeiro_id);
  const tipoMatricula = body.tipo_matricula;
  const itensParsed = parseItens(body.itens);
  if (itensParsed === null) {
    return badRequest("itens invalidos.");
  }
  const execucoesRaw = (body as Record<string, unknown>).execucoes;
  const execucoesArray = Array.isArray(execucoesRaw) ? execucoesRaw : null;
  const modoManual = !!execucoesArray;
  if (execucoesArray && !execucoesArray.every(isExecucaoManual)) {
    return badRequest("execucoes invalidas.");
  }
  const execucoesParsed = parseExecucoes(execucoesRaw);
  if (execucoesParsed === null) {
    return badRequest("execucoes invalidas.");
  }
  const execucoesIn = execucoesParsed ?? [];
  const hasExecucoes = Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, "execucoes");
  if (hasExecucoes && execucoesIn.length === 0) {
    return badRequest("execucoes_obrigatorias.");
  }
  const totalMensalidadeManual =
    typeof body.total_mensalidade_centavos === "number" ? Number(body.total_mensalidade_centavos) : NaN;
  if (modoManual && (!Number.isFinite(totalMensalidadeManual) || totalMensalidadeManual <= 0)) {
    return NextResponse.json(
      { ok: false, error: "total_mensalidade_centavos_invalido_no_modo_manual" },
      { status: 400 },
    );
  }
  const politicaPrimeiroPagamento = parsePoliticaPrimeiroPagamento(body.politica_primeiro_pagamento);
  if (body.politica_primeiro_pagamento && !politicaPrimeiroPagamento) {
    return badRequest("politica_primeiro_pagamento invalida.");
  }
  const politicaModo = politicaPrimeiroPagamento?.modo ?? "PADRAO";
  if (politicaModo === "ADIAR_PARA_VENCIMENTO") {
    const motivo = politicaPrimeiroPagamento?.motivo_excecao?.trim() ?? "";
    if (!motivo) {
      return badRequest("motivo_excecao_obrigatorio.");
    }
  }

  const usarExecucoes = modoManual && execucoesIn.length > 0;
  const itensIn = usarExecucoes ? [] : itensParsed ?? [];
  const hasItens = !usarExecucoes && Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, "itens");
  if (hasItens && itensIn.length === 0) {
    return badRequest("itens_obrigatorios.");
  }

  const itensResolved: MatriculaItem[] = [];
  for (const it of itensIn) {
    const servicoId = Number(it.servico_id);
    const ueId = Number(it.unidade_execucao_id);
    const turmaIdDirect = it.turma_id ?? null;

    if (!Number.isFinite(servicoId) || !Number.isFinite(ueId)) continue;

    if (typeof turmaIdDirect === "number" && Number.isFinite(turmaIdDirect)) {
      itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: turmaIdDirect });
      continue;
    }

    const { data: ue, error: ueErr } = await supabase
      .from("escola_unidades_execucao")
      .select("origem_tipo, origem_id")
      .eq("unidade_execucao_id", ueId)
      .maybeSingle();

    if (ueErr || !ue || ue.origem_tipo !== "TURMA" || !ue.origem_id) {
      return jsonError("RESOLVER_TURMA_FAIL", "Nao foi possivel resolver turma.", 500, { ue_id: ueId, ueErr });
    }

    itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: Number(ue.origem_id) });
  }

  if (itensIn.length > 0 && itensResolved.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_invalidos" }, { status: 400 });
  }

  const itens = itensIn.length > 0 ? itensResolved : [];

  let vinculoId = Number(body.vinculo_id);
  const vinculosIdsParsed = normalizeIdArray(body.vinculos_ids);
  if (vinculosIdsParsed === null) {
    return badRequest("vinculos_ids invalidos.");
  }
  let vinculosIds = vinculosIdsParsed ?? [];

  if (usarExecucoes) {
    const vinculoBody = Number(body.vinculo_id);
    if (Number.isFinite(vinculoBody) && vinculoBody > 0) {
      vinculoId = vinculoBody;
    } else {
      vinculoId = execucoesIn[0]?.turma_id ?? vinculoId;
    }

    if (vinculosIds.length === 0) {
      vinculosIds = Array.from(new Set(execucoesIn.map((execucao) => execucao.turma_id)));
    }
    if (Number.isFinite(vinculoId) && vinculoId > 0 && !vinculosIds.includes(vinculoId)) {
      vinculosIds.unshift(vinculoId);
    }
  } else if (itens.length > 0) {
    const principal = itens[0];
    vinculoId = principal.turma_id;
    vinculosIds = Array.from(new Set(itens.map((item) => item.turma_id)));
  } else {
    if (!Number.isFinite(vinculoId) || vinculoId <= 0) {
      vinculoId = vinculosIds[0] ?? NaN;
    }

    if (vinculosIds.length === 0 && Number.isFinite(vinculoId) && vinculoId > 0) {
      vinculosIds = [vinculoId];
    } else if (vinculosIds.length > 0 && Number.isFinite(vinculoId) && !vinculosIds.includes(vinculoId)) {
      vinculosIds.unshift(vinculoId);
    }
  }

  const execucaoByTurma = new Map<number, ExecucaoManual>();
  if (usarExecucoes) {
    for (const execucao of execucoesIn) {
      if (execucaoByTurma.has(execucao.turma_id)) {
        return badRequest("execucao_turma_duplicada.", { turma_id: execucao.turma_id });
      }
      execucaoByTurma.set(execucao.turma_id, execucao);
    }
  }

  const nivelIdRaw = usarExecucoes ? null : body.nivel_id ?? null;
  const nivelId = nivelIdRaw === null ? null : Number(nivelIdRaw);
  if (!usarExecucoes && nivelIdRaw !== null && (!Number.isInteger(nivelId) || nivelId <= 0)) {
    return badRequest("nivel_id invalido.");
  }

  if (!pessoaId || !respFinId || !tipoMatricula || !Number.isFinite(vinculoId) || vinculoId <= 0) {
    return badRequest(
      "Campos obrigatorios ausentes: pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id (ou itens/vinculos_ids).",
    );
  }

  const anoRef = body.ano_referencia ?? null;

  const dataMatricula = parseDateOrNull(body.data_matricula) ?? null;
  const dataInicioVinculo = parseDateOrNull(body.data_inicio_vinculo) ?? dataMatricula ?? null;

  const escolaTabelaPrecoCursoId = body.escola_tabela_preco_curso_id ?? null;
  const planoPagamentoId = body.plano_pagamento_id ?? null;

  const formaLiquidacaoPadrao = body.forma_liquidacao_padrao ?? null;
  const documentoModeloId = body.documento_modelo_id ?? body.contrato_modelo_id ?? null;

  if (tipoMatricula === "REGULAR" && (anoRef === null || typeof anoRef !== "number")) {
    return badRequest("ano_referencia e obrigatorio para tipo_matricula = REGULAR.");
  }

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();

  if (pessoaErr) return serverError("VALIDAR_PESSOA_FAIL", "Falha ao validar pessoa.", { pessoaErr });
  if (!pessoa) return badRequest("pessoa_id nao encontrado.");

  const { data: respFin, error: respErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", respFinId)
    .maybeSingle();

  if (respErr) return serverError("VALIDAR_RESPONSAVEL_FAIL", "Falha ao validar responsavel financeiro.", { respErr });
  if (!respFin) return badRequest("responsavel_financeiro_id nao encontrado.");

  const { data: turmas, error: turmaErr } = await supabase
    .from("turmas")
    .select("turma_id")
    .in("turma_id", vinculosIds);

  if (turmaErr) return serverError("VALIDAR_TURMA_FAIL", "Falha ao validar turma (vinculo_id).", { turmaErr });

  const foundIds = new Set((turmas ?? []).map((t) => Number((t as { turma_id?: number }).turma_id)));
  const missingIds = vinculosIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return badRequest("vinculo_id (turma) nao encontrado.", { missing_ids: missingIds });
  }

  let execucoesValidas: ExecucaoManual[] = execucoesIn;

  if (usarExecucoes) {
    const { data: turmaNiveis, error: turmaNiveisError } = await supabase
      .from("turma_niveis")
      .select("turma_id, nivel_id")
      .in("turma_id", vinculosIds);

    if (turmaNiveisError) {
      return serverError("VALIDAR_NIVEIS_TURMAS_FAIL", "Falha ao validar niveis das turmas.", {
        turmaNiveisError,
        turma_ids: vinculosIds,
      });
    }

    const niveisPorTurma = new Map<number, Set<number>>();
    const nivelIds = new Set<number>();
    (turmaNiveis ?? []).forEach((row) => {
      const turmaId = Number((row as { turma_id?: number }).turma_id);
      const nivelId = Number((row as { nivel_id?: number }).nivel_id);
      if (!Number.isFinite(turmaId) || !Number.isFinite(nivelId)) return;
      if (!niveisPorTurma.has(turmaId)) niveisPorTurma.set(turmaId, new Set());
      niveisPorTurma.get(turmaId)!.add(nivelId);
    });

    execucoesValidas = [];
    for (const execucao of execucoesIn) {
      const niveisTurma = niveisPorTurma.get(execucao.turma_id) ?? new Set<number>();
      if (niveisTurma.size > 0) {
        if (!execucao.nivel_id) {
          return badRequest("nivel_id_obrigatorio.", { turma_id: execucao.turma_id });
        }
        if (!niveisTurma.has(execucao.nivel_id)) {
          return badRequest("nivel_id_nao_pertence_a_turma.", { turma_id: execucao.turma_id });
        }
        nivelIds.add(execucao.nivel_id);
      }
    }

    const niveisById = new Map<number, string>();
    if (nivelIds.size > 0) {
      const { data: niveisData, error: niveisErr } = await supabase
        .from("niveis")
        .select("id, nome")
        .in("id", Array.from(nivelIds));

      if (niveisErr) {
        return serverError("VALIDAR_NIVEIS_FAIL", "Falha ao validar niveis.", { niveisErr });
      }

      (niveisData ?? []).forEach((nivelRow) => {
        const id = Number((nivelRow as { id?: number }).id);
        const nome = (nivelRow as { nome?: string }).nome;
        if (Number.isFinite(id) && typeof nome === "string") {
          niveisById.set(id, nome);
        }
      });
    }

    execucoesValidas = [];
    for (const execucao of execucoesIn) {
      const nivelNome = execucao.nivel_id ? niveisById.get(execucao.nivel_id) ?? execucao.nivel : execucao.nivel;
      const nivelFinal = (nivelNome ?? "").trim();
      if (!nivelFinal) {
        return badRequest("nivel_obrigatorio.", { turma_id: execucao.turma_id });
      }
      execucoesValidas.push({ ...execucao, nivel: nivelFinal });
    }
  } else {
    const { data: turmaNiveis, error: turmaNiveisError } = await supabase
      .from("turma_niveis")
      .select("nivel_id")
      .eq("turma_id", vinculoId);

    if (turmaNiveisError) {
      return serverError("VALIDAR_NIVEIS_TURMA_FAIL", "Falha ao validar niveis da turma.", {
        turmaNiveisError,
        turma_id: vinculoId,
      });
    }

    const turmaPossuiNiveis = (turmaNiveis?.length ?? 0) > 0;
    if (turmaPossuiNiveis) {
      if (!nivelId) return badRequest("nivel_id_obrigatorio.");
      const nivelOk = (turmaNiveis ?? []).some((row) => Number(row.nivel_id) === nivelId);
      if (!nivelOk) return badRequest("nivel_id_nao_pertence_a_turma.");
    }
  }

  if (!usarExecucoes && anoRef !== null) {
    const resolveUrl = new URL("/api/matriculas/precos/resolver", req.url);
    resolveUrl.searchParams.set("aluno_id", String(pessoaId));
    resolveUrl.searchParams.set("alvo_tipo", "TURMA");
    resolveUrl.searchParams.set("alvo_id", String(vinculoId));
    resolveUrl.searchParams.set("ano", String(anoRef));

    const resolveRes = await fetch(resolveUrl.toString(), {
      headers: { cookie: cookieStore.toString() },
    });

    let resolvePayload: { ok?: boolean; message?: string; details?: Record<string, unknown> } | null = null;
    try {
      resolvePayload = (await resolveRes.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, unknown>;
      };
    } catch {
      resolvePayload = null;
    }

    if (!resolveRes.ok || !resolvePayload?.ok) {
      const status = resolveRes.status === 409 ? 409 : resolveRes.status === 400 ? 400 : 500;
      const errorCode = status === 409 ? "conflict" : status === 400 ? "bad_request" : "server_error";
      return NextResponse.json(
        {
          ok: false,
          error: errorCode,
          message: resolvePayload?.message || "Falha ao validar precificacao.",
          details: resolvePayload?.details ?? null,
        },
        { status },
      );
    }
  }

  if (!usarExecucoes && escolaTabelaPrecoCursoId !== null) {
    const { data: tabelaPreco, error: tabErr } = await supabase
      .from("escola_tabelas_precos_cursos")
      .select("id, ativo")
      .eq("id", escolaTabelaPrecoCursoId)
      .maybeSingle();

    if (tabErr) {
      return serverError("VALIDAR_TABELA_PRECO_FAIL", "Falha ao validar escola_tabela_preco_curso_id.", { tabErr });
    }
    if (!tabelaPreco) return badRequest("escola_tabela_preco_curso_id nao encontrado.");
    if (!tabelaPreco.ativo) return badRequest("Tabela de precos informada esta inativa.");
  }

  let plano: PlanoPagamentoMvp | null = null;

  if (planoPagamentoId !== null) {
    const { data: planoDb, error: planoErr } = await supabase
      .from("matricula_planos_pagamento")
      .select(
        [
          "id",
          "ativo",
          "ciclo_cobranca",
          "numero_parcelas",
          "termino_cobranca",
          "data_fim_manual",
          "regra_total_devido",
          "permite_prorrata",
          "ciclo_financeiro",
          "forma_liquidacao_padrao",
        ].join(","),
      )
      .eq("id", planoPagamentoId)
      .maybeSingle();

    if (planoErr) {
      return serverError("VALIDAR_PLANO_PAGAMENTO_FAIL", "Falha ao validar plano_pagamento_id.", { planoErr });
    }
    if (!planoDb) return badRequest("plano_pagamento_id nao encontrado.");

    plano = planoDb as unknown as PlanoPagamentoMvp;

    if (!plano.ativo) return badRequest("Plano de pagamento informado esta inativo.");

    if (!plano.ciclo_cobranca) {
      return badRequest("Plano de pagamento invalido: ciclo_cobranca ausente.");
    }

    if (plano.ciclo_cobranca === "COBRANCA_EM_PARCELAS") {
      if (!plano.numero_parcelas || plano.numero_parcelas <= 0) {
        return badRequest("Plano invalido: COBRANCA_EM_PARCELAS exige numero_parcelas.");
      }
    }

    if (plano.ciclo_cobranca === "COBRANCA_MENSAL") {
      if (!plano.termino_cobranca) {
        return badRequest("Plano invalido: COBRANCA_MENSAL exige termino_cobranca.");
      }
      if (plano.termino_cobranca === "DATA_ESPECIFICA" && !plano.data_fim_manual) {
        return badRequest("Plano invalido: DATA_ESPECIFICA exige data_fim_manual.");
      }
      if (plano.termino_cobranca === "FIM_ANO_LETIVO") {
        const anoBase = anoRef ?? (dataInicioVinculo ? Number(String(dataInicioVinculo).slice(0, 4)) : null);
        if (!anoBase || Number.isNaN(anoBase)) {
          return badRequest("Plano com termino FIM_ANO_LETIVO exige ano_referencia (ou data_inicio_vinculo valida).");
        }
      }
    }
  }

  if (tipoMatricula === "REGULAR") {
    const { data: dup, error: dupErr } = await supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", pessoaId)
      .eq("vinculo_id", vinculoId)
      .eq("tipo_matricula", "REGULAR")
      .eq("ano_referencia", anoRef)
      .in("status_fluxo", ["PENDENTE_CONFIRMACAO", "CONCLUIDA", "ATIVA"])
      .limit(1);

    if (dupErr) {
      return serverError("CHECAR_DUPLICIDADE_FAIL", "Falha ao checar duplicidade de matricula.", { dupErr });
    }
    if (dup && dup.length > 0) {
      return conflict("Matricula REGULAR duplicada para a mesma pessoa/turma/ano.", { matricula_id: dup[0]?.id });
    }
  }

  let totalMensalidadeCentavos = Number(body.total_mensalidade_centavos ?? 0);
  if (!Number.isFinite(totalMensalidadeCentavos)) totalMensalidadeCentavos = 0;
  if (usarExecucoes) {
    totalMensalidadeCentavos = Math.trunc(totalMensalidadeManual);
  }
  if (politicaModo === "ADIAR_PARA_VENCIMENTO" && totalMensalidadeCentavos <= 0) {
    return badRequest("total_mensalidade_centavos_obrigatorio_para_adiar.");
  }

  let primeiraCobranca: PrimeiraCobrancaCalc | null = null;
  let primeiraCobrancaStatus: string | null = null;
  let excecaoPrimeiroPagamento = false;
  let motivoExcecaoPrimeiroPagamento: string | null = null;
  let excecaoAutorizadaPor: string | null = null;
  let excecaoCriadaEm: string | null = null;

  if (totalMensalidadeCentavos > 0) {
    primeiraCobranca = calcularPrimeiraCobranca({
      totalCentavos: totalMensalidadeCentavos,
      dataInicio: dataInicioVinculo,
      dataMatricula: dataMatricula,
    });

    if (politicaModo === "ADIAR_PARA_VENCIMENTO") {
      const motivo = politicaPrimeiroPagamento?.motivo_excecao?.trim() ?? "";
      excecaoPrimeiroPagamento = true;
      motivoExcecaoPrimeiroPagamento = motivo;
      excecaoAutorizadaPor = user.id;
      excecaoCriadaEm = new Date().toISOString();
      primeiraCobrancaStatus = "ADIADA_EXCECAO";
    } else {
      primeiraCobrancaStatus = "PENDENTE";
    }
  }

  const statusFluxoInicial =
    politicaModo === "ADIAR_PARA_VENCIMENTO" ? "PENDENTE_CONFIRMACAO" : "AGUARDANDO_LIQUIDACAO";
  const concluidaEm = statusFluxoInicial === "CONCLUIDA" ? new Date().toISOString() : null;
  const insertPayload: Record<string, unknown> = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: respFinId,
    tipo_matricula: tipoMatricula,
    vinculo_id: vinculoId,
    ano_referencia: anoRef,
    data_matricula: dataMatricula,
    data_inicio_vinculo: dataInicioVinculo,
    escola_tabela_preco_curso_id: escolaTabelaPrecoCursoId,
    plano_pagamento_id: planoPagamentoId,
    forma_liquidacao_padrao: formaLiquidacaoPadrao ?? plano?.forma_liquidacao_padrao ?? null,
    documento_modelo_id: documentoModeloId,
    observacoes: body.observacoes ?? null,
    status_fluxo: statusFluxoInicial,
    concluida_em: concluidaEm ?? undefined,
    total_mensalidade_centavos: totalMensalidadeCentavos,
    rascunho_expira_em: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    status: "ATIVA",
    created_by: user.id,
    updated_by: user.id,
    primeira_cobranca_tipo: primeiraCobranca?.tipo ?? undefined,
    primeira_cobranca_status: primeiraCobrancaStatus ?? undefined,
    primeira_cobranca_valor_centavos: primeiraCobranca?.valor_centavos ?? undefined,
    excecao_primeiro_pagamento: excecaoPrimeiroPagamento || undefined,
    motivo_excecao_primeiro_pagamento: motivoExcecaoPrimeiroPagamento ?? undefined,
    excecao_autorizada_por: excecaoAutorizadaPor ?? undefined,
    excecao_criada_em: excecaoCriadaEm ?? undefined,
  };

  for (const k of Object.keys(insertPayload)) {
    if (insertPayload[k] === undefined) delete insertPayload[k];
  }

  const { data: matriculaCriada, error: insErr } = await supabase
    .from("matriculas")
    .insert(insertPayload)
    .select(
      "id, pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id, ano_referencia, data_matricula, data_inicio_vinculo, escola_tabela_preco_curso_id, plano_pagamento_id, forma_liquidacao_padrao, documento_modelo_id, status",
    )
    .single();

  if (insErr) return serverError("CRIAR_MATRICULA_FAIL", "Falha ao criar matricula.", { insErr });

  const matriculaId = (matriculaCriada as { id: number }).id;

  if (usarExecucoes && execucoesValidas.length > 0) {
    const rows = execucoesValidas.map((execucao) => ({
      matricula_id: matriculaId,
      turma_id: execucao.turma_id,
      nivel: execucao.nivel,
      valor_mensal_centavos: execucao.valor_mensal_centavos,
      origem_valor: "MANUAL",
      ativo: true,
    }));

    const { error: execErr } = await admin.from("matricula_execucao_valores").insert(rows);
    if (execErr) {
      const msg = execErr.message ?? "";
      if (msg.includes("relation") && msg.includes("matricula_execucao_valores")) {
        return jsonError("TABELA_AUXILIAR_NAO_EXISTE", execErr, 400, {
          hint: "Aplique a migration SQL da tabela matricula_execucao_valores no Supabase.",
        });
      }
      return jsonError("MANUAL_INSERT_EXECUCOES_FAIL", "Falha ao salvar valores manuais.", 500, { execErr });
    }
  }

  if (politicaModo === "ADIAR_PARA_VENCIMENTO") {
    try {
      if (!primeiraCobranca) {
        return serverError("PRIMEIRA_COBRANCA_AUSENTE", "Falha ao resolver primeira cobranca.", {
          matricula_id: matriculaId,
        });
      }

      const conta = await ensureContaCreditoConexaoAluno({
        supabase: admin,
        pessoaTitularId: respFinId,
      });

      const contaConexaoId = Number((conta as { id?: number }).id);
      if (!Number.isFinite(contaConexaoId) || contaConexaoId <= 0) {
        return serverError("CONTA_CARTAO_INVALIDA", "Conta Cartao Conexao invalida.", {
          matricula_id: matriculaId,
        });
      }

      const diaVencimentoRaw = Number((conta as { dia_vencimento?: number | null }).dia_vencimento ?? 12);
      const diaFechamentoRaw = Number((conta as { dia_fechamento?: number | null }).dia_fechamento ?? 10);
      const diaVencimento = Math.min(28, Math.max(1, Math.trunc(diaVencimentoRaw)));
      const diaFechamento = Math.min(28, Math.max(1, Math.trunc(diaFechamentoRaw)));

      const baseData = dataMatricula ?? dataInicioVinculo ?? new Date().toISOString().slice(0, 10);
      const vencimentoEntrada = proximoVencimento(diaVencimento, baseData);

      if (primeiraCobranca.tipo === "ENTRADA_PRORATA" && primeiraCobranca.valor_centavos > 0) {
        const { data: cobrancaEntrada, error: errCob } = await admin
          .from("cobrancas")
          .insert({
            pessoa_id: respFinId,
            descricao: "Entrada / Pro-rata - matricula",
            valor_centavos: primeiraCobranca.valor_centavos,
            vencimento: vencimentoEntrada,
            status: "PENDENTE",
            origem_tipo: "MATRICULA",
            origem_id: matriculaId,
          })
          .select("id")
          .single();

        if (errCob || !cobrancaEntrada) {
          return serverError("CRIAR_COBRANCA_ENTRADA_FAIL", "Falha ao criar cobranca de entrada.", { errCob });
        }

        const cobrancaEntradaId = Number((cobrancaEntrada as { id?: number }).id);
        if (Number.isFinite(cobrancaEntradaId) && cobrancaEntradaId > 0) {
          const { error: updMatErr } = await admin
            .from("matriculas")
            .update({
              primeira_cobranca_cobranca_id: cobrancaEntradaId,
              primeira_cobranca_status: "ADIADA_EXCECAO",
              primeira_cobranca_valor_centavos: primeiraCobranca.valor_centavos,
              primeira_cobranca_data_pagamento: null,
            })
            .eq("id", matriculaId);

          if (updMatErr) {
            return serverError("ATUALIZAR_MATRICULA_ENTRADA_FAIL", "Falha ao atualizar matricula.", {
              updMatErr,
            });
          }

          const ledgerEntrada = {
            matricula_id: matriculaId,
            tipo: "ENTRADA",
            descricao: "Entrada / Pro-rata",
            valor_centavos: primeiraCobranca.valor_centavos,
            vencimento: vencimentoEntrada,
            data_evento: null,
            status: "PENDENTE",
            origem_tabela: "cobrancas",
            origem_id: cobrancaEntradaId,
          };

          const { error: ledgerErr } = await admin.from("matriculas_financeiro_linhas").insert(ledgerEntrada);
          if (ledgerErr) {
            return serverError("INSERIR_LEDGER_ENTRADA_FAIL", "Falha ao registrar ledger da entrada.", {
              ledgerErr,
            });
          }
        }
      }

      const competenciaInicio = buildPeriodo(
        primeiraCobranca.ano_base,
        primeiraCobranca.mes_primeira_mensalidade,
      );
      let competenciaFim = buildPeriodo(primeiraCobranca.ano_base, 12);

      if (Number.isFinite(vinculoId) && vinculoId > 0) {
        const { data: turmaRef, error: turmaErr } = await admin
          .from("turmas")
          .select("periodo_letivo_id")
          .eq("turma_id", vinculoId)
          .maybeSingle();

        if (!turmaErr && turmaRef?.periodo_letivo_id) {
          const periodoLetivoId = Number(turmaRef.periodo_letivo_id);
          if (Number.isFinite(periodoLetivoId) && periodoLetivoId > 0) {
            const { data: periodo, error: periodoErr } = await admin
              .from("periodos_letivos")
              .select("data_fim")
              .eq("id", periodoLetivoId)
              .maybeSingle();

            if (!periodoErr) {
              const dataFim = typeof periodo?.data_fim === "string" ? periodo.data_fim : null;
              if (dataFim) {
                const fim = ymFromDate(dataFim);
                competenciaFim = fim < competenciaInicio ? competenciaInicio : fim;
              }
            }
          }
        }
      }

      const competencias = buildCompetenciasBetween(competenciaInicio, competenciaFim);
      const anosCompetencia = new Set(competencias.map((competencia) => Number(competencia.slice(0, 4))));

      for (const ano of anosCompetencia) {
        if (!Number.isFinite(ano)) continue;
        await ensureFaturasAno({
          supabase: admin,
          contaConexaoId,
          ano,
          diaFechamento,
          diaVencimento,
        });
      }

      const composicaoBase = usarExecucoes
        ? {
            fonte: "MATRICULA_MANUAL",
            aluno_pessoa_id: pessoaId,
            responsavel_financeiro_id: respFinId,
            total_centavos: totalMensalidadeCentavos,
            itens: execucoesValidas.map((execucao) => ({
              turma_id: execucao.turma_id,
              descricao: execucao.nivel ? `Nivel ${execucao.nivel}` : `Turma ${execucao.turma_id}`,
              valor_centavos: execucao.valor_mensal_centavos,
            })),
          }
        : {
            fonte: "MATRICULA_AUTO",
            aluno_pessoa_id: pessoaId,
            responsavel_financeiro_id: respFinId,
            total_centavos: totalMensalidadeCentavos,
          };

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
          supabase: admin,
          pessoaId: respFinId,
          matriculaId,
          competencia,
          valorCentavos: totalMensalidadeCentavos,
          vencimento,
          descricao,
        });

        const lancamento = await upsertLancamentoPorCobranca({
          cobrancaId,
          contaConexaoId,
          competencia,
          valorCentavos: totalMensalidadeCentavos,
          descricao,
          origemSistema: "MATRICULA",
          origemId: matriculaId,
          composicaoJson: { ...composicaoBase, competencia },
        });

        await vincularLancamentoNaFatura({
          supabase: admin,
          contaConexaoId,
          periodoReferencia: competencia,
          lancamentoId: lancamento.id,
        });

        const ledgerLinha = {
          matricula_id: matriculaId,
          tipo: "LANCAMENTO_CREDITO",
          descricao,
          valor_centavos: totalMensalidadeCentavos,
          vencimento: null,
          data_evento: `${competencia}-01`,
          status: "PENDENTE_FATURA",
          origem_tabela: "credito_conexao_lancamentos",
          origem_id: lancamento.id,
        };

        const { error: ledgerErr } = await admin.from("matriculas_financeiro_linhas").insert(ledgerLinha);
        if (ledgerErr) {
          return serverError("INSERIR_LEDGER_MENSALIDADE_FAIL", "Falha ao registrar ledger de mensalidade.", {
            ledgerErr,
          });
        }
      }
    } catch (err) {
      return jsonError("ADIAR_PROCESSAMENTO_FAIL", err, 500, { matricula_id: matriculaId });
    }
  }
  return NextResponse.json({ ok: true, matricula: matriculaCriada }, { status: 201 });
  } catch (e: unknown) {
    return jsonError("UNHANDLED_EXCEPTION", e, 500);
  }
}
