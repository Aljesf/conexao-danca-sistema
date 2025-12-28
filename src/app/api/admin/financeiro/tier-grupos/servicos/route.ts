import { NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

type ServicoRow = {
  id: number;
  titulo: string | null;
  tipo: string;
  ativo: boolean;
  tier_grupo_id: number | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("ENV ausente: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function isMissingRelation(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: "bad_request", message }, { status: 400 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("escola_produtos_educacionais")
      .select("id,titulo,tipo,ativo,tier_grupo_id")
      .order("titulo", { ascending: true });

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          { ok: true, servicos: [], warning: "Tabela escola_produtos_educacionais nao existe (migracao pendente)." },
          { status: 200 },
        );
      }
      return serverError("Falha ao listar servicos.", { error });
    }

    return NextResponse.json({ ok: true, servicos: (data ?? []) as ServicoRow[] }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao listar servicos.";
    return serverError(message);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as { servico_id?: number; tier_grupo_id?: number | null } | null;

    const servicoId = typeof body?.servico_id === "number" ? Math.trunc(body.servico_id) : NaN;
    if (!Number.isInteger(servicoId) || servicoId <= 0) return badRequest("servico_id invalido.");

    const tierGrupoIdRaw = body?.tier_grupo_id;
    const tierGrupoId =
      tierGrupoIdRaw === null || tierGrupoIdRaw === undefined
        ? null
        : typeof tierGrupoIdRaw === "number" && Number.isFinite(tierGrupoIdRaw) && tierGrupoIdRaw > 0
          ? Math.trunc(tierGrupoIdRaw)
          : null;

    const { data, error } = await supabase
      .from("escola_produtos_educacionais")
      .update({ tier_grupo_id: tierGrupoId })
      .eq("id", servicoId)
      .select("id,titulo,tipo,ativo,tier_grupo_id")
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          { ok: false, error: "schema_missing", message: "Tabela escola_produtos_educacionais nao existe (migracao pendente)." },
          { status: 409 },
        );
      }
      return serverError("Falha ao atualizar servico.", { error });
    }

    if (!data) return badRequest("servico nao encontrado.");

    return NextResponse.json({ ok: true, servico: data as ServicoRow }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao atualizar servico.";
    return serverError(message);
  }
}
