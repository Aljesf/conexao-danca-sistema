import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const vendaId = Number(ctx.params.id);
  if (!Number.isFinite(vendaId)) {
    return NextResponse.json({ error: "venda_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_vendas")
    .select("*, cafe_venda_itens(*, cafe_produtos(id, nome))")
    .eq("id", vendaId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "venda_nao_encontrada" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}
