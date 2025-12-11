import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "ID invalido de subcategoria." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Body invalido." }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if ("centro_custo_id" in body) {
    update.centro_custo_id = body.centro_custo_id ?? null;
  }
  if ("receita_categoria_id" in body) {
    update.receita_categoria_id = body.receita_categoria_id ?? null;
  }
  if ("despesa_categoria_id" in body) {
    update.despesa_categoria_id = body.despesa_categoria_id ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nenhum campo para atualizar." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("loja_produto_categoria_subcategoria")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar subcategoria de produto:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar subcategoria." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
