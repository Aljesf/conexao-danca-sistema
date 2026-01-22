import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function toInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await ctx.params;
  const pid = toInt(id);

  if (!pid) return NextResponse.json({ error: "ID invalido." }, { status: 400 });

  const { data, error } = await supabase
    .from("financeiro_tiers")
    .select("tabela_id,tabela_item_id")
    .eq("politica_id", pid)
    .eq("ativo", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uniq = new Set<string>();
  const itens = (data ?? [])
    .filter((x) => x.tabela_id != null && x.tabela_item_id != null)
    .filter((x) => {
      const key = `${x.tabela_id}:${x.tabela_item_id}`;
      if (uniq.has(key)) return false;
      uniq.add(key);
      return true;
    });

  return NextResponse.json({ itens });
}

