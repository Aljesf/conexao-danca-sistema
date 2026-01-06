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

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  data_inicio: string | null;
  ano_referencia: number | null;
  contexto_matricula_id: number | null;
};

type TurmaAtiva = {
  turma_id: number;
  nome: string | null;
  data_inicio: string | null;
  ano_referencia: number | null;
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

function isTurmaAtivaStatus(statusRaw: unknown): boolean {
  if (statusRaw === null || statusRaw === undefined) return true;
  const s = String(statusRaw).trim().toUpperCase();
  if (!s) return true;
  if (s.includes("CANCEL")) return false;
  if (s === "INATIVO" || s === "INATIVA") return false;
  return true;
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
    const alunoIdBody = toPositiveNumber(body.aluno_pessoa_id);
    const responsavelBody = toPositiveNumber(body.responsavel_financeiro_id);
    const anoBody = toPositiveNumber(body.ano_referencia);
    if (!matriculaId && !alunoIdBody) {
      return errJson(
        "bad_request",
        "Informe matricula_id ou aluno_pessoa_id.",
        400,
        { matricula_id: body.matricula_id, aluno_pessoa_id: body.aluno_pessoa_id },
      );
    }

    const admin = getSupabaseAdmin();

    let alunoId: number | null = alunoIdBody ?? null;
    let responsavelId: number | null = responsavelBody ?? null;
    let contextoId = toPositiveNumber(body.contexto_matricula_id);
    let anoReferencia = anoBody ?? null;

    if (matriculaId) {
      const { data: matricula, error: matErr } = await admin
        .from("matriculas")
        .select("id,pessoa_id,responsavel_financeiro_id,vinculo_id,ano_referencia")
        .eq("id", matriculaId)
        .maybeSingle();

      if (matErr) {
        return errJson("server_error", "Falha ao buscar matricula.", 500, { matErr });
      }
      if (!matricula) {
        return errJson("not_found", "Matricula nao encontrada.", 404);
      }

      alunoId = toPositiveNumber((matricula as { pessoa_id?: number }).pessoa_id);
      responsavelId =
        toPositiveNumber((matricula as { responsavel_financeiro_id?: number }).responsavel_financeiro_id) ??
        alunoId;
      if (!anoReferencia) {
        anoReferencia = toPositiveNumber((matricula as { ano_referencia?: number | null }).ano_referencia);
      }

      if (!contextoId) {
        const vinculoId = toPositiveNumber((matricula as { vinculo_id?: number }).vinculo_id);
        if (vinculoId) {
          const { data: turmaCtx, error: turmaCtxErr } = await admin
            .from("turmas")
            .select("contexto_matricula_id")
            .eq("turma_id", vinculoId)
            .maybeSingle();
          if (!turmaCtxErr) {
            contextoId = toPositiveNumber(
              (turmaCtx as { contexto_matricula_id?: number | null })?.contexto_matricula_id,
            );
          }
        }
      }
    }

    if (!alunoId || !responsavelId) {
      return errJson("bad_request", "Aluno/responsavel financeiro invalidos.", 400);
    }

    if (!contextoId) {
      return errJson(
        "bad_request",
        "contexto_matricula_id obrigatorio para gerar lancamentos mensais.",
        400,
      );
    }

    const { data: contexto, error: ctxErr } = await admin
      .from("escola_contextos_matricula")
      .select("id,ano_referencia")
      .eq("id", contextoId)
      .maybeSingle();
    if (ctxErr) {
      return errJson("server_error", "Falha ao buscar contexto da matricula.", 500, { ctxErr });
    }

    const anoRef =
      toPositiveNumber((contexto as { ano_referencia?: number | null })?.ano_referencia) ??
      anoReferencia ??
      new Date().getFullYear();

    const { data: turmasCtx, error: turmasErr } = await admin
      .from("turmas")
      .select("turma_id,nome,data_inicio,ano_referencia,contexto_matricula_id")
      .eq("contexto_matricula_id", contextoId);

    if (turmasErr) {
      return errJson("server_error", "Falha ao buscar turmas do contexto.", 500, { turmasErr });
    }

    const turmaIds = (turmasCtx ?? [])
      .map((row) => toPositiveNumber((row as { turma_id?: number }).turma_id))
      .filter((id): id is number => !!id);

    if (turmaIds.length === 0) {
      return NextResponse.json({ ok: true, data: { lancamentos: [] } }, { status: 200 });
    }

    const { data: vinculos, error: vincErr } = await admin
      .from("turma_aluno")
      .select("turma_id,status,dt_fim")
      .eq("aluno_pessoa_id", alunoId)
      .is("dt_fim", null)
      .in("turma_id", turmaIds);

    if (vincErr) {
      return errJson("server_error", "Falha ao buscar vinculos ativos do aluno.", 500, { vincErr });
    }

    const turmaAtivaSet = new Set<number>(
      (vinculos ?? [])
        .map((row) => {
          const record = row as { turma_id?: number | null; status?: string | null };
          const turmaId = toPositiveNumber(record.turma_id);
          if (!turmaId) return null;
          if (!isTurmaAtivaStatus(record.status)) return null;
          return turmaId;
        })
        .filter((id): id is number => !!id),
    );

    const turmasAtivas: TurmaAtiva[] = (turmasCtx ?? [])
      .map((row) => {
        const record = row as TurmaRow;
        const turmaId = toPositiveNumber(record.turma_id);
        if (!turmaId || !turmaAtivaSet.has(turmaId)) return null;
        return {
          turma_id: turmaId,
          nome: record.nome ?? null,
          data_inicio: record.data_inicio ?? null,
          ano_referencia: record.ano_referencia ?? null,
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
      return NextResponse.json({ ok: true, data: { lancamentos: [] } }, { status: 200 });
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

    const composicaoTextoCurto = composicaoItens
      .map((x) => `${x.label} (${x.posicao}a)`)
      .join(" + ");

    const descricao = `Mensalidade (${competencia}) - ${composicaoTextoCurto}`;
    const referenciaItem = `mensalidade|ctx:${contextoId}|aluno:${alunoId}|comp:${competencia}`;
    const composicaoJson = {
      competencia,
      contexto_matricula_id: contextoId,
      aluno_pessoa_id: alunoId,
      responsavel_financeiro_id: responsavelId,
      ano_referencia: anoRef,
      total_centavos: totalCentavos,
      total_brl: (totalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      itens: composicaoItens,
    };

    const { error: insErr } = await admin.from("credito_conexao_lancamentos").insert({
      conta_conexao_id: contaConexaoId,
      origem_sistema: "MATRICULA_MENSAL",
      origem_id: contextoId,
      descricao,
      valor_centavos: totalCentavos,
      data_lancamento: `${competencia}-01`,
      status: "PENDENTE_FATURA",
      competencia,
      referencia_item: referenciaItem,
      composicao_json: composicaoJson,
    });

    if (insErr) {
      const msg = insErr.message ?? "";
      const isDup =
        insErr.code === "23505" ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("unique");
      if (isDup) {
        return NextResponse.json(
          { ok: true, data: { created: 0, skipped: 1, total_centavos: totalCentavos } },
          { status: 200 },
        );
      }
      return errJson("server_error", "Falha ao criar lancamento mensal consolidado.", 500, { insErr });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          created: 1,
          skipped: 0,
          conta_conexao_id: contaConexaoId,
          competencia,
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
