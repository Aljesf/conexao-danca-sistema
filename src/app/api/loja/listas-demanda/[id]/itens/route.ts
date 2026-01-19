import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;
  const listaId = Number(id);

  if (!Number.isFinite(listaId) || listaId <= 0) {
    return NextResponse.json({ error: "Lista invalida" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        produto_id?: number | null;
        produto_variacao_id?: number | null;
        pessoa_id?: number | null;
        descricao_livre?: string | null;
        quantidade?: number;
        observacoes?: string | null;
      }
    | null;

  const quantidade = Number(body?.quantidade ?? 0);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return NextResponse.json({ error: "quantidade_invalida" }, { status: 400 });
  }

  const payload = {
    lista_id: listaId,
    produto_id: normalizeNullableNumber(body?.produto_id),
    produto_variacao_id: normalizeNullableNumber(body?.produto_variacao_id),
    pessoa_id: normalizeNullableNumber(body?.pessoa_id),
    descricao_livre: body?.descricao_livre?.trim() || null,
    quantidade,
    observacoes: body?.observacoes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("loja_listas_demanda_itens")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
