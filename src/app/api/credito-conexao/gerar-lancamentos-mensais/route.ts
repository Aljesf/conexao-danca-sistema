import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type GerarMensalBody = {
  matricula_id?: number;
  contexto_matricula_id?: number | null;
  aluno_pessoa_id?: number;
  responsavel_financeiro_id?: number;
  ano_referencia?: number;
  competencia?: string | null; // YYYY-MM (opcional)
};

type TurmaAtiva = {
  turma_id: number;
  nome: string | null;
  data_inicio: string | null;
};

type TurmaAlunoRow = {
  turma_id: number | null;
  turmas?: {
    turma_id?: number | null;
    nome?: string | null;
    data_inicio?: string | null;
  } | null;
};

type ResolverResp = {
  ok: boolean;
  data?: {
    item_aplicado?: {
      valor_centavos: number;
      descricao?: string | null;
      codigo_item?: string;
    };
    valor_final_centavos?: number | null;
    valor_final_brl?: string | null;
  };
  message?: string;
  error?: string;
};

type ApiErrorCode = "bad_request" | "unauthorized" | "not_found" | "server_error" | "conflict";

function errJson(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown> | null) {
  return NextResponse.json({ ok: false, error: code, message, details: details ?? null }, { status });
}

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCompetencia(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function competenciaAtual(): string {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mes = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

async function fetchVencimentoDiaPadrao(admin: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  const { data, error } = await admin
    .from("matricula_configuracoes")
    .select("vencimento_dia_padrao")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 10;
  const dia = Number((data[0] as { vencimento_dia_padrao?: number }).vencimento_dia_padrao);
  return Number.isFinite(dia) && dia >= 1 && dia <= 31 ? dia : 10;
}

async function ensureContaConexao(
  admin: ReturnType<typeof getSupabaseAdmin>,
  pessoaTitularId: number,
): Promise<number> {
  const { data: contas, error: contasErr } = await admin
    .from("credito_conexao_contas")
    .select("id, ativo, tipo_conta")
    .eq("pessoa_titular_id", pessoaTitularId)
    .eq("tipo_conta", "ALUNO")
    .order("id", { ascending: false })
    .limit(1);

  if (contasErr && !isSchemaMissing(contasErr)) {
    throw new Error("falha_buscar_conta_conexao");
  }

  if (contas && contas.length > 0) {
    const conta = contas[0] as { id?: number; ativo?: boolean };
    if (conta.ativo === false) {
      throw new Error("conta_conexao_inativa");
    }
    const contaId = toPositiveNumber(conta.id);
    if (!contaId) throw new Error("conta_conexao_invalida");
    return contaId;
  }

  const diaVenc = await fetchVencimentoDiaPadrao(admin);
  const { data: created, error: createErr } = await admin
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: pessoaTitularId,
      tipo_conta: "ALUNO",
      descricao_exibicao: null,
      dia_fechamento: 10,
      dia_vencimento: diaVenc,
      centro_custo_principal_id: null,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createErr || !created) {
    throw new Error("falha_criar_conta_conexao");
  }

  const contaId = toPositiveNumber((created as { id?: number }).id);
  if (!contaId) throw new Error("conta_conexao_invalida");
  return contaId;
}

async function resolverMensalidadePorTurma(
  req: Request,
  cookieHeader: string,
  alunoId: number,
  turmaId: number,
  ano: number,
  tierOrdemOverride?: number | null,
): Promise<{ valor_centavos: number; descricao: string | null }> {
  const resolveUrl = new URL("/api/matriculas/precos/resolver", req.url);
  resolveUrl.searchParams.set("aluno_id", String(alunoId));
  resolveUrl.searchParams.set("alvo_tipo", "TURMA");
  resolveUrl.searchParams.set("alvo_id", String(turmaId));
  resolveUrl.searchParams.set("ano", String(ano));
  if (tierOrdemOverride && Number.isFinite(tierOrdemOverride)) {
    resolveUrl.searchParams.set("tier_ordem_override", String(tierOrdemOverride));
  }

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

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) {
      return errJson("unauthorized", "Nao autenticado.", 401);
    }

    let body: GerarMensalBody;
    try {
      body = (await req.json()) as GerarMensalBody;
    } catch {
      return errJson("bad_request", "JSON invalido.", 400);
    }

    const matriculaId = toPositiveNumber(body.matricula_id);
    const anoBody = toPositiveNumber(body.ano_referencia);
    if (!matriculaId) {
      return errJson("bad_request", "matricula_id_obrigatorio", 400, { matricula_id: body.matricula_id });
    }

    const admin = getSupabaseAdmin();

    const { data: matricula, error: matErr } = await admin
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,ano_referencia")
      .eq("id", matriculaId)
      .maybeSingle();

    if (matErr) {
      return errJson("server_error", "Falha ao buscar matricula.", 500, { matErr });
    }
    if (!matricula) {
      return errJson("not_found", "Matricula nao encontrada.", 404);
    }

    const alunoId = toPositiveNumber((matricula as { pessoa_id?: number }).pessoa_id);
    const responsavelId =
      toPositiveNumber((matricula as { responsavel_financeiro_id?: number }).responsavel_financeiro_id) ??
      alunoId;
    const anoRef =
      anoBody ??
      toPositiveNumber((matricula as { ano_referencia?: number | null }).ano_referencia) ??
      new Date().getFullYear();

    if (!alunoId || !responsavelId) {
      return errJson("bad_request", "Aluno/responsavel financeiro invalidos.", 400);
    }

    const { data: turmasRaw, error: turmasErr } = await admin
      .from("turma_aluno")
      .select("turma_id, turmas:turmas(turma_id,nome,data_inicio)")
      .eq("matricula_id", matriculaId)
      .in("status", ["ATIVO", "ativo"]);

    if (turmasErr) {
      return errJson("server_error", "Falha ao buscar turmas da matricula.", 500, { turmasErr });
    }

    const turmasAtivas: TurmaAtiva[] = (turmasRaw ?? [])
      .map((row) => {
        const record = row as TurmaAlunoRow;
        const turmaId = toPositiveNumber(record.turma_id ?? record.turmas?.turma_id);
        if (!turmaId) return null;
        return {
          turma_id: turmaId,
          nome: record.turmas?.nome ?? null,
          data_inicio: record.turmas?.data_inicio ?? null,
        };
      })
      .filter((row): row is TurmaAtiva => !!row)
      .sort((a, b) => {
        const da = a.data_inicio ?? "";
        const db = b.data_inicio ?? "";
        if (da && db) return da.localeCompare(db);
        if (da) return -1;
        if (db) return 1;
        return a.turma_id - b.turma_id;
      });

    if (turmasAtivas.length === 0) {
      return errJson("bad_request", "sem_turmas_ativas_para_matricula", 400);
    }

    const contaConexaoId = await ensureContaConexao(admin, responsavelId);
    const competencia = normalizeCompetencia(body.competencia) ?? competenciaAtual();
    const cookieHeader = cookieStore.toString();

    const itensAtivos: Array<{
      servico_id: number | null;
      unidade_execucao_id: number | null;
      turma_id: number;
      label: string;
    }> = [];
    const { data: ues, error: ueErr } = await admin
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id,servico_id,origem_id")
      .eq("origem_tipo", "TURMA")
      .in("origem_id", turmasAtivas.map((t) => t.turma_id))
      .eq("ativo", true);

    if (ueErr && !isSchemaMissing(ueErr)) {
      return errJson("server_error", "Falha ao resolver unidades de execucao.", 500, { ueErr });
    }

    const ueByTurma = new Map<number, { unidade_execucao_id: number; servico_id: number | null }>();
    (ues ?? []).forEach((row) => {
      const record = row as { unidade_execucao_id?: number; servico_id?: number | null; origem_id?: number | null };
      const turmaId = toPositiveNumber(record.origem_id);
      const ueId = toPositiveNumber(record.unidade_execucao_id);
      if (!turmaId || !ueId) return;
      ueByTurma.set(turmaId, {
        unidade_execucao_id: ueId,
        servico_id: toPositiveNumber(record.servico_id),
      });
    });

    for (const turma of turmasAtivas) {
      const ueRef = ueByTurma.get(turma.turma_id) ?? null;
      itensAtivos.push({
        turma_id: turma.turma_id,
        label: turma.nome?.trim() || `Turma ${turma.turma_id}`,
        servico_id: ueRef?.servico_id ?? null,
        unidade_execucao_id: ueRef?.unidade_execucao_id ?? null,
      });
    }

    if (itensAtivos.length === 0) {
      return NextResponse.json(
        { ok: true, data: { created: 0, skipped: 0, message: "Sem itens ativos para esta competencia." } },
        { status: 200 },
      );
    }

    let totalCentavos = 0;
    const composicaoItens: Array<{
      posicao: number;
      servico_id: number | null;
      unidade_execucao_id: number | null;
      turma_id: number;
      label: string;
      valor_centavos: number;
      valor_brl: string;
    }> = [];

    for (let i = 0; i < itensAtivos.length; i++) {
      const it = itensAtivos[i];
      const posicaoTier = i + 1;

      const resultado = await resolverMensalidadePorTurma(
        req,
        cookieHeader,
        alunoId,
        it.turma_id,
        anoRef,
        posicaoTier,
      );

      totalCentavos += resultado.valor_centavos;
      const valorBrl = (resultado.valor_centavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      composicaoItens.push({
        posicao: posicaoTier,
        servico_id: it.servico_id,
        unidade_execucao_id: it.unidade_execucao_id,
        turma_id: it.turma_id,
        label: it.label,
        valor_centavos: resultado.valor_centavos,
        valor_brl: valorBrl,
      });
    }

    const descricao =
      `Mensalidade (${competencia}) - ` +
      composicaoItens.map((item) => `${item.posicao}a modalidade: ${item.valor_brl}`).join(" | ");
    const referenciaItem = `mensalidade|matricula:${matriculaId}|comp:${competencia}`;
    const composicaoJson = {
      matricula_id: matriculaId,
      competencia,
      aluno_pessoa_id: alunoId,
      responsavel_financeiro_id: responsavelId,
      ano_referencia: anoRef,
      total_centavos: totalCentavos,
      total_brl: (totalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      itens: composicaoItens,
    };

    const payloadLanc = {
      conta_conexao_id: contaConexaoId,
      origem_sistema: "MATRICULA_MENSAL",
      origem_id: matriculaId,
      descricao,
      valor_centavos: totalCentavos,
      data_lancamento: `${competencia}-01`,
      status: "PENDENTE_FATURA",
      competencia,
      referencia_item: referenciaItem,
      composicao_json: composicaoJson,
    };

    const { error: upErr } = await admin.from("credito_conexao_lancamentos").upsert(payloadLanc, {
      onConflict: "conta_conexao_id,competencia,referencia_item",
      ignoreDuplicates: false,
    });

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: "falha_upsert_lancamento_consolidado", detail: upErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          upserted: 1,
          total_centavos: totalCentavos,
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return errJson("server_error", "Erro inesperado ao gerar lancamentos mensais.", 500, { message: msg });
  }
}
