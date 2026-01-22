import { NextResponse, type NextRequest } from "next/server";
import { requireUser, type ApiAuthContext } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function parseId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function resolvePoliticaPk(supabase: ApiAuthContext["supabase"]) {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "financeiro_politicas_preco");

  if (error) return "id";
  const columns = new Set((data ?? []).map((row) => String((row as { column_name?: string }).column_name)));
  if (columns.has("politica_preco_id")) return "politica_preco_id";
  return "id";
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await ctx.params;
  const politicaId = parseId(id);

  if (!politicaId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const pk = await resolvePoliticaPk(supabase);
  const body = (await req.json().catch(() => null)) as
    | { nome?: unknown; descricao?: unknown; ativo?: unknown }
    | null;

  const patch: Record<string, unknown> = {};
  if (typeof body?.nome === "string" && body.nome.trim()) patch.nome = body.nome.trim();
  if (typeof body?.descricao === "string") patch.descricao = body.descricao.trim();
  if (typeof body?.ativo === "boolean") patch.ativo = body.ativo;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .update(patch)
    .eq(pk, politicaId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const politica = data ? { ...(data as Record<string, unknown>), id: (data as Record<string, unknown>)[pk] } : null;
  return NextResponse.json({ politica });
}

