import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type VinculoPayload = {
  documento_modelo_id?: number;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  return id;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos_modelos")
    .select(
      [
        "documento_modelo_id",
        "documentos_modelo (id, tipo_contrato, titulo, versao, ativo)",
      ].join(","),
    )
    .eq("grupo_id", grupoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as VinculoPayload;
  const modeloId = typeof body.documento_modelo_id === "number" ? body.documento_modelo_id : null;

  if (!modeloId || !Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "documento_modelo_id obrigatorio." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos_modelos")
    .insert({
      grupo_id: grupoId,
      documento_modelo_id: modeloId,
    })
    .select("*")
    .single();

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json({ error: "Vinculo ja existe." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as VinculoPayload;
  const modeloId = typeof body.documento_modelo_id === "number" ? body.documento_modelo_id : null;

  if (!modeloId || !Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "documento_modelo_id obrigatorio." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { error } = await supabase
    .from("documentos_grupos_modelos")
    .delete()
    .eq("grupo_id", grupoId)
    .eq("documento_modelo_id", modeloId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
