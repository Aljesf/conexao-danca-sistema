import { NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

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
  return !!e && typeof e.code === "string" && e.code === "42P01";
}

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: "bad_request", message }, { status: 400 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: { tierGrupoId?: string } }) {
  try {
    const tierGrupoId = parseId(ctx.params.tierGrupoId);
    if (!tierGrupoId) return badRequest("tier_grupo_id invalido.");

    const body = (await req.json().catch(() => null)) as {
      ordem?: number;
      valor_centavos?: number;
      ativo?: boolean;
    } | null;

    const ordem = typeof body?.ordem === "number" ? Math.trunc(body.ordem) : NaN;
    const valor = typeof body?.valor_centavos === "number" ? Math.trunc(body.valor_centavos) : NaN;
    if (!Number.isInteger(ordem) || ordem <= 0) return badRequest("ordem invalida.");
    if (!Number.isInteger(valor) || valor <= 0) return badRequest("valor_centavos invalido.");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("financeiro_tiers")
      .upsert(
        { tier_grupo_id: tierGrupoId, ordem, valor_centavos: valor, ativo: typeof body?.ativo === "boolean" ? body.ativo : true },
        { onConflict: "tier_grupo_id,ordem" },
      )
      .select("tier_id,tier_grupo_id,ordem,valor_centavos,ativo")
      .single();

    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          { ok: false, error: "schema_missing", message: "Tabela financeiro_tiers nao existe (migracao pendente)." },
          { status: 409 },
        );
      }
      return serverError("Falha ao salvar tier.", { error });
    }

    return NextResponse.json({ ok: true, tier: data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao salvar tier.";
    return serverError(message);
  }
}
