import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ResumoItem = {
  produto_id: number | null;
  produto_variacao_id: number | null;
  descricao: string;
  quantidade: number;
};

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = await createClient();
  const listaId = Number(ctx.params.id);

  if (!Number.isFinite(listaId) || listaId <= 0) {
    return NextResponse.json({ error: "Lista invalida" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("loja_listas_demanda_itens")
    .select("produto_id,produto_variacao_id,descricao_livre,quantidade")
    .eq("lista_id", listaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string, ResumoItem>();

  for (const row of data ?? []) {
    const produtoId = row.produto_id ?? null;
    const variacaoId = row.produto_variacao_id ?? null;
    const descricao = row.descricao_livre ?? "";
    const key = `${produtoId ?? "null"}|${variacaoId ?? "null"}|${descricao}`;

    const current = map.get(key);
    if (current) {
      current.quantidade += Number(row.quantidade ?? 0);
    } else {
      map.set(key, {
        produto_id: produtoId,
        produto_variacao_id: variacaoId,
        descricao,
        quantidade: Number(row.quantidade ?? 0),
      });
    }
  }

  return NextResponse.json({ items: Array.from(map.values()) }, { status: 200 });
}
