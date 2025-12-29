import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

function parseId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tierId = parseId(id);

  if (!tierId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const patch = { ...body };
  delete patch.id;
  delete patch.tier_id;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("financeiro_tiers")
    .update(patch)
    .eq("tier_id", tierId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? {}) as Record<string, unknown>;
  if (row.politica_id == null && row.politica_preco_id != null) {
    row.politica_id = row.politica_preco_id;
  }
  return NextResponse.json({ tier: row });
}
