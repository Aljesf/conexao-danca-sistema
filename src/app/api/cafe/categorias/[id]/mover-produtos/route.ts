import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type Ctx = {
  params: {
    id: string;
  };
};

function asPositiveInt(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n > 0 ? n : null;
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const fromId = asPositiveInt(ctx.params.id);
  if (!fromId) {
    return NextResponse.json({ error: "categoria_origem_invalida" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const toCategoriaId = asPositiveInt(body.to_categoria_id);
  if (!toCategoriaId) {
    return NextResponse.json({ error: "categoria_destino_invalida" }, { status: 400 });
  }
  if (toCategoriaId === fromId) {
    return NextResponse.json({ error: "destino_igual_origem" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: fromCategoria, error: fromErr } = await supabase
    .from("cafe_categorias")
    .select("id")
    .eq("id", fromId)
    .maybeSingle();
  if (fromErr) {
    return NextResponse.json(
      { error: "falha_validar_categoria_origem", detail: fromErr.message },
      { status: 500 },
    );
  }
  if (!fromCategoria) {
    return NextResponse.json({ error: "categoria_origem_invalida" }, { status: 400 });
  }

  const { data: toCategoria, error: toErr } = await supabase
    .from("cafe_categorias")
    .select("id")
    .eq("id", toCategoriaId)
    .maybeSingle();
  if (toErr) {
    return NextResponse.json(
      { error: "falha_validar_categoria_destino", detail: toErr.message },
      { status: 500 },
    );
  }
  if (!toCategoria) {
    return NextResponse.json({ error: "categoria_destino_invalida" }, { status: 400 });
  }

  const { error } = await supabase
    .from("cafe_produtos")
    .update({ categoria_id: toCategoriaId, subcategoria_id: null })
    .eq("categoria_id", fromId);

  if (error) {
    return NextResponse.json(
      { error: "falha_ao_mover_produtos", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
