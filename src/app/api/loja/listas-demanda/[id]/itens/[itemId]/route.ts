import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string; itemId: string } }) {
  const listaId = toInt(ctx.params.id);
  const itemId = toInt(ctx.params.itemId);
  if (!listaId || !itemId) return NextResponse.json({ error: "param_invalido" }, { status: 400 });

  const supabase = await createClient();

  const body = (await req.json()) as {
    quantidade?: number;
    observacoes?: string | null;
    descricao_livre?: string | null;
  };

  const quantidade = body.quantidade;
  if (!Number.isFinite(quantidade) || (quantidade ?? 0) <= 0) {
    return NextResponse.json({ error: "quantidade_invalida" }, { status: 400 });
  }

  const { data: lista, error: eLista } = await supabase
    .from("loja_listas_demanda")
    .select("id,status,bloqueada")
    .eq("id", listaId)
    .maybeSingle();

  if (eLista || !lista) return NextResponse.json({ error: "lista_nao_encontrada" }, { status: 404 });
  if (lista.status !== "ATIVA" || lista.bloqueada) {
    return NextResponse.json({ error: "lista_nao_editavel" }, { status: 409 });
  }

  const patch = {
    quantidade,
    observacoes: body.observacoes?.trim().length ? body.observacoes.trim() : null,
    descricao_livre: body.descricao_livre?.trim().length ? body.descricao_livre.trim() : null,
  };

  const { error } = await supabase
    .from("loja_listas_demanda_itens")
    .update(patch)
    .eq("id", itemId)
    .eq("lista_id", listaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string; itemId: string } }) {
  const listaId = toInt(ctx.params.id);
  const itemId = toInt(ctx.params.itemId);
  if (!listaId || !itemId) return NextResponse.json({ error: "param_invalido" }, { status: 400 });

  const supabase = await createClient();

  const { data: lista, error: eLista } = await supabase
    .from("loja_listas_demanda")
    .select("id,status,bloqueada")
    .eq("id", listaId)
    .maybeSingle();

  if (eLista || !lista) return NextResponse.json({ error: "lista_nao_encontrada" }, { status: 404 });
  if (lista.status !== "ATIVA" || lista.bloqueada) {
    return NextResponse.json({ error: "lista_nao_editavel" }, { status: 409 });
  }

  const { error } = await supabase
    .from("loja_listas_demanda_itens")
    .delete()
    .eq("id", itemId)
    .eq("lista_id", listaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
