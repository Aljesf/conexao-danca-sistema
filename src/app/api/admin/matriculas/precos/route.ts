import { NextResponse } from "next/server";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

type MatriculaPrecoTurma = {
  id: number;
  turma_id: number;
  ano_referencia: number;
  plano_id: number;
  centro_custo_id: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseRouteClient = Awaited<ReturnType<typeof getSupabaseRoute>>;

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 400 }
  );
}

function notFound(message: string) {
  return NextResponse.json({ ok: false, error: { message } }, { status: 404 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { message, details: details ?? null } },
    { status: 500 }
  );
}

function parseIntStrict(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

async function existsByColumn(
  supabase: SupabaseRouteClient,
  table: string,
  column: string,
  id: number
) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq(column, id)
    .maybeSingle();

  if (error) return { ok: false as const, error };
  return { ok: true as const, exists: !!data };
}

async function existsById(supabase: SupabaseRouteClient, table: string, id: number) {
  return existsByColumn(supabase, table, "id", id);
}

async function existsTurma(supabase: SupabaseRouteClient, turmaId: number) {
  const byTurmaId = await existsByColumn(supabase, "turmas", "turma_id", turmaId);
  if (byTurmaId.ok) return byTurmaId;
  if (byTurmaId.error?.code !== "42703") return byTurmaId;
  return existsByColumn(supabase, "turmas", "id", turmaId);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ano = parseIntStrict(searchParams.get("ano"));
  const turmaId = parseIntStrict(searchParams.get("turma_id"));
  const includeInativos = searchParams.get("include_inativos") === "1";

  const supabase = await getSupabaseRoute();

  let query = supabase
    .from("matricula_precos_turma")
    .select("*")
    .order("id", { ascending: false });

  if (ano !== null) query = query.eq("ano_referencia", ano);
  if (turmaId !== null) query = query.eq("turma_id", turmaId);
  if (!includeInativos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) {
    return serverError("Falha ao listar precos de matricula.", { supabase: error });
  }

  return NextResponse.json({ ok: true, data: (data ?? []) as MatriculaPrecoTurma[] });
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("JSON invalido.");
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("Payload invalido.");
  }

  const obj = payload as Record<string, unknown>;

  const turmaId = parseIntStrict(obj.turma_id);
  const ano = parseIntStrict(obj.ano_referencia);
  const planoId = parseIntStrict(obj.plano_id);
  const centroCustoId =
    obj.centro_custo_id === undefined || obj.centro_custo_id === null
      ? null
      : parseIntStrict(obj.centro_custo_id);

  if (turmaId === null || turmaId <= 0) {
    return badRequest("turma_id invalido.");
  }
  if (ano === null || ano < 2000 || ano > 2100) {
    return badRequest("ano_referencia invalido.");
  }
  if (planoId === null || planoId <= 0) {
    return badRequest("plano_id invalido.");
  }
  if (obj.centro_custo_id !== undefined && centroCustoId === null) {
    return badRequest("centro_custo_id invalido.");
  }

  const supabase = await getSupabaseRoute();

  const turmaExists = await existsTurma(supabase, turmaId);
  if (!turmaExists.ok) return serverError("Falha ao validar turma.", { supabase: turmaExists.error });
  if (!turmaExists.exists) return notFound("Turma nao encontrada.");

  const planoExists = await existsById(supabase, "matricula_planos", planoId);
  if (!planoExists.ok) return serverError("Falha ao validar plano.", { supabase: planoExists.error });
  if (!planoExists.exists) return notFound("Plano nao encontrado.");

  if (centroCustoId !== null) {
    const ccExists = await existsById(supabase, "centros_custo", centroCustoId);
    if (!ccExists.ok) {
      return serverError("Falha ao validar centro de custo.", { supabase: ccExists.error });
    }
    if (!ccExists.exists) return notFound("Centro de custo nao encontrado.");
  }

  const { data: conflito, error: conflitoErr } = await supabase
    .from("matricula_precos_turma")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("ano_referencia", ano)
    .eq("ativo", true)
    .maybeSingle();

  if (conflitoErr) {
    return serverError("Falha ao validar preco ativo existente.", { supabase: conflitoErr });
  }
  if (conflito) {
    return badRequest("Ja existe preco ativo para esta turma e ano.", {
      turma_id: turmaId,
      ano_referencia: ano,
    });
  }

  const { data, error } = await supabase
    .from("matricula_precos_turma")
    .insert({
      turma_id: turmaId,
      ano_referencia: ano,
      plano_id: planoId,
      centro_custo_id: centroCustoId,
      ativo: true,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("Ja existe preco ativo para esta turma e ano.", {
        turma_id: turmaId,
        ano_referencia: ano,
      });
    }
    return serverError("Falha ao criar preco por turma.", { supabase: error });
  }

  return NextResponse.json({ ok: true, data: data as MatriculaPrecoTurma });
}

export async function PUT(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("JSON invalido.");
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("Payload invalido.");
  }

  const obj = payload as Record<string, unknown>;
  const id = parseIntStrict(obj.id);
  if (id === null || id <= 0) return badRequest("id invalido.");

  const patch: Record<string, unknown> = {};

  if (obj.plano_id !== undefined) {
    const planoId = parseIntStrict(obj.plano_id);
    if (planoId === null || planoId <= 0) return badRequest("plano_id invalido.");
    patch.plano_id = planoId;
  }

  if (obj.centro_custo_id !== undefined) {
    if (obj.centro_custo_id === null) {
      patch.centro_custo_id = null;
    } else {
      const ccId = parseIntStrict(obj.centro_custo_id);
      if (ccId === null || ccId <= 0) return badRequest("centro_custo_id invalido.");
      patch.centro_custo_id = ccId;
    }
  }

  if (obj.ativo !== undefined) {
    if (typeof obj.ativo !== "boolean") return badRequest("ativo invalido.");
    patch.ativo = obj.ativo;
  }

  const supabase = await getSupabaseRoute();

  if (patch.plano_id !== undefined) {
    const planoExists = await existsById(supabase, "matricula_planos", patch.plano_id as number);
    if (!planoExists.ok) return serverError("Falha ao validar plano.", { supabase: planoExists.error });
    if (!planoExists.exists) return notFound("Plano nao encontrado.");
  }

  if (patch.centro_custo_id !== undefined && patch.centro_custo_id !== null) {
    const ccExists = await existsById(supabase, "centros_custo", patch.centro_custo_id as number);
    if (!ccExists.ok) {
      return serverError("Falha ao validar centro de custo.", { supabase: ccExists.error });
    }
    if (!ccExists.exists) return notFound("Centro de custo nao encontrado.");
  }

  const { data, error } = await supabase
    .from("matricula_precos_turma")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return badRequest("Ja existe preco ativo para esta turma e ano.");
    }
    return serverError("Falha ao atualizar preco por turma.", { supabase: error });
  }
  if (!data) return notFound("Preco por turma nao encontrado.");

  return NextResponse.json({ ok: true, data: data as MatriculaPrecoTurma });
}
