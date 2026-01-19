import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: Request, ctx: { params: Promise<{ itemId?: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdmin();
    const { itemId: itemIdRaw } = await ctx.params;
    const itemId = parseId(itemIdRaw);
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "item_id_invalido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("servico_itens_precos")
      .select("id,item_id,valor_centavos,moeda,vigencia_inicio,vigencia_fim,ativo,created_at")
      .eq("item_id", itemId)
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_precos", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, precos: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ itemId?: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdmin();
    const { itemId: itemIdRaw } = await ctx.params;
    const itemId = parseId(itemIdRaw);
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "item_id_invalido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as {
      valor_centavos?: number;
      moeda?: string | null;
      ativo?: boolean | null;
      vigencia_inicio?: string | null;
      vigencia_fim?: string | null;
    } | null;

    const valor = Number(body?.valor_centavos);
    if (!Number.isFinite(valor) || valor < 0) {
      return NextResponse.json(
        { ok: false, error: "payload_invalido", message: "valor_centavos invalido" },
        { status: 400 },
      );
    }

    if (body?.ativo ?? true) {
      const { error: updateError } = await supabase
        .from("servico_itens_precos")
        .update({ ativo: false })
        .eq("item_id", itemId)
        .eq("ativo", true);
      if (updateError) {
        return NextResponse.json(
          { ok: false, error: "erro_atualizar_precos", message: updateError.message },
          { status: 500 },
        );
      }
    }

    const payload = {
      item_id: itemId,
      valor_centavos: Math.round(valor),
      moeda: String(body?.moeda ?? "BRL").toUpperCase(),
      vigencia_inicio: body?.vigencia_inicio ?? null,
      vigencia_fim: body?.vigencia_fim ?? null,
      ativo: Boolean(body?.ativo ?? true),
    };

    const { data, error } = await supabase
      .from("servico_itens_precos")
      .insert(payload)
      .select("id,item_id,valor_centavos,moeda,vigencia_inicio,vigencia_fim,ativo,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_criar_preco", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, preco: data }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message }, { status: 500 });
  }
}
