import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = await createClient();
  const produtoId = Number(ctx.params.id);

  if (!Number.isFinite(produtoId) || produtoId <= 0) {
    return NextResponse.json({ error: "Produto invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("loja_produto_variantes")
    .select("id,produto_id,sku,cor_id,numeracao_id,tamanho_id,ativo")
    .eq("produto_id", produtoId)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}
