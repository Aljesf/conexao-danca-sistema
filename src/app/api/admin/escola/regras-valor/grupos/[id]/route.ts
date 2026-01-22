import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function parseId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

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

  const { data, error } = await supabase
    .from("financeiro_tier_grupos")
    .update(patch)
    .eq("tier_grupo_id", grupoId)
    .select("tier_grupo_id,nome,descricao,ativo,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ grupo: data });
}

