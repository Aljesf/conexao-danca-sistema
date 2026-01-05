import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type PreviewBody = {
  matricula_id?: number;
  contexto_matricula_id?: number | null;
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
  };
  message?: string;
  error?: string;
};

type ApiErrorCode = "bad_request" | "unauthorized" | "not_found" | "server_error";

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

function isTurmaAtivaStatus(statusRaw: unknown): boolean {
  if (statusRaw === null || statusRaw === undefined) return true;
  const s = String(statusRaw).trim().toUpperCase();
  if (!s) return true;
  if (s.includes("CANCEL")) return false;
  if (s === "INATIVO" || s === "INATIVA") return false;
  return true;
}

function calcMesesEntre(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 12;
  const [y1, m1] = inicio.split("-").map((v) => Number(v));
  const [y2, m2] = fim.split("-").map((v) => Number(v));
  if (!y1 || !m1 || !y2 || !m2) return 12;
  const diff = (y2 - y1) * 12 + (m2 - m1) + 1;
  return diff > 0 ? diff : 12;
}

async function resolverMensalidadePorTurma(
  req: Request,
  cookieHeader: string,
  alunoId: number,
  turmaId: number,
  ano: number,
): Promise<{ valor_centavos: number; descricao: string | null }> {
  const resolveUrl = new URL("/api/matriculas/precos/resolver", req.url);
  resolveUrl.searchParams.set("aluno_id", String(alunoId));
  resolveUrl.searchParams.set("alvo_tipo", "TURMA");
  resolveUrl.searchParams.set("alvo_id", String(turmaId));
  resolveUrl.searchParams.set("ano", String(ano));

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
  const valor = Number(item?.valor_centavos);
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

    let body: PreviewBody;
    try {
      body = (await req.json()) as PreviewBody;
    } catch {
      return errJson("bad_request", "JSON invalido.", 400);
    }

    const matriculaId = toPositiveNumber(body.matricula_id);
    if (!matriculaId) {
      return errJson("bad_request", "matricula_id invalido.", 400, { matricula_id: body.matricula_id });
    }

    const admin = getSupabaseAdmin();

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

    const alunoId = toPositiveNumber((matricula as { pessoa_id?: number }).pessoa_id);
    if (!alunoId) {
      return errJson("bad_request", "Matricula sem aluno valido.", 400);
    }

    let contextoId = toPositiveNumber(body.contexto_matricula_id);
    if (!contextoId) {
      const vinculoId = toPositiveNumber((matricula as { vinculo_id?: number }).vinculo_id);
      if (vinculoId) {
        const { data: turmaCtx, error: turmaCtxErr } = await admin
          .from("turmas")
          .select("contexto_matricula_id")
          .eq("turma_id", vinculoId)
          .maybeSingle();
        if (!turmaCtxErr) {
          contextoId = toPositiveNumber((turmaCtx as { contexto_matricula_id?: number | null })?.contexto_matricula_id);
        }
      }
    }

    if (!contextoId) {
      return errJson(
        "bad_request",
        "contexto_matricula_id obrigatorio para gerar preview financeiro.",
        400,
      );
    }

    const { data: contexto, error: ctxErr } = await admin
      .from("escola_contextos_matricula")
      .select("id,ano_referencia,data_inicio,data_fim")
      .eq("id", contextoId)
      .maybeSingle();
    if (ctxErr) {
      return errJson("server_error", "Falha ao buscar contexto da matricula.", 500, { ctxErr });
    }

    const anoRef =
      toPositiveNumber((contexto as { ano_referencia?: number | null })?.ano_referencia) ??
      toPositiveNumber((matricula as { ano_referencia?: number | null })?.ano_referencia) ??
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
      return NextResponse.json({ ok: true, data: { preview: [] } }, { status: 200 });
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
      return NextResponse.json({ ok: true, data: { preview: [] } }, { status: 200 });
    }

    const cookieHeader = cookieStore.toString();
    const preview: Array<Record<string, unknown>> = [];
    let totalMensal = 0;

    for (const turma of turmasAtivas) {
      const resultado = await resolverMensalidadePorTurma(req, cookieHeader, alunoId, turma.turma_id, anoRef);
      totalMensal += resultado.valor_centavos;
      preview.push({
        turma_id: turma.turma_id,
        turma_nome: turma.nome ?? null,
        valor_centavos: resultado.valor_centavos,
        descricao: resultado.descricao ?? "Mensalidade",
        ano_referencia: turma.ano_referencia ?? anoRef,
      });
    }

    const meses = calcMesesEntre(
      (contexto as { data_inicio?: string | null })?.data_inicio ?? null,
      (contexto as { data_fim?: string | null })?.data_fim ?? null,
    );
    const totalAnual = totalMensal * meses;

    const snapshot = {
      matricula_id: matriculaId,
      contexto_matricula_id: contextoId,
      meses_previstos: meses,
      total_mensal_previsto_centavos: totalMensal,
      total_anual_previsto_centavos: totalAnual,
      itens: preview,
    };

    const { data: saved, error: saveErr } = await admin
      .from("matriculas_compromissos_previstos")
      .insert({
        contexto_matricula_id: contextoId,
        aluno_pessoa_id: alunoId,
        total_anual_previsto_centavos: totalAnual,
        total_mensal_previsto_centavos: totalMensal,
        snapshot_json: snapshot,
      })
      .select("id,contexto_matricula_id,aluno_pessoa_id,total_anual_previsto_centavos,total_mensal_previsto_centavos,created_at")
      .single();

    if (saveErr) {
      if (isSchemaMissing(saveErr)) {
        return errJson("server_error", "Tabela de compromissos previstos nao encontrada.", 500, { saveErr });
      }
      return errJson("server_error", "Falha ao salvar compromisso previsto.", 500, { saveErr });
    }

    return NextResponse.json({ ok: true, data: { preview, snapshot: saved } }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return errJson("server_error", "Erro inesperado ao gerar preview financeiro.", 500, { message: msg });
  }
}
