import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function asNumberId(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("id invalido");
  return n;
}

type MedidaInput = {
  categoria: string;
  tamanho: string;
  data_referencia?: string | null;
  observacao?: string | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_medidas_declaradas")
      .select("*")
      .eq("pessoa_id", pessoaId)
      .order("data_referencia", { ascending: false })
      .order("id", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ items: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const body = (await req.json()) as MedidaInput;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_medidas_declaradas")
      .insert({
        pessoa_id: pessoaId,
        categoria: body.categoria,
        tamanho: body.tamanho,
        data_referencia: body.data_referencia ?? null,
        observacao: body.observacao ?? null,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { id: number } & MedidaInput;

    const itemId = Number(body.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "id invalido" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_medidas_declaradas")
      .update({
        categoria: body.categoria,
        tamanho: body.tamanho,
        data_referencia: body.data_referencia ?? null,
        observacao: body.observacao ?? null,
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ item: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = asNumberId(String(searchParams.get("id") ?? ""));

    const supabase = await createClient();

    const { error } = await supabase.from("pessoa_medidas_declaradas").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
