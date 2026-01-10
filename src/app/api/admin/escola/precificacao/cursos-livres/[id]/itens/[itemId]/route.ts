import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id, itemId } = await ctx.params;
  const tabelaPrecoId = parseId(id);
  const itemIdParsed = parseId(itemId);

  if (!tabelaPrecoId || !itemIdParsed) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const payload: unknown = await req.json();
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = [
    "codigo",
    "titulo",
    "descricao",
    "qtd_turmas",
    "qtd_pessoas",
    "valor_centavos",
    "ordem",
    "ativo",
  ] as const;

  for (const key of allowed) {
    if (key in p) {
      updateData[key] = p[key];
    }
  }

  const { error } = await supabase
    .from("escola_precos_cursos_livres_itens")
    .update(updateData)
    .eq("id", itemIdParsed)
    .eq("tabela_preco_id", tabelaPrecoId);

  if (error) {
    return NextResponse.json(
      { error: "falha_atualizar_item", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id, itemId } = await ctx.params;
  const tabelaPrecoId = parseId(id);
  const itemIdParsed = parseId(itemId);

  if (!tabelaPrecoId || !itemIdParsed) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const { error } = await supabase
    .from("escola_precos_cursos_livres_itens")
    .delete()
    .eq("id", itemIdParsed)
    .eq("tabela_preco_id", tabelaPrecoId);

  if (error) {
    return NextResponse.json(
      { error: "falha_remover_item", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
