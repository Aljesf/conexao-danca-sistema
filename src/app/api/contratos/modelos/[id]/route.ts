import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ContratoModeloUpdatePayload = {
  tipo_contrato?: string;
  titulo?: string;
  versao?: string;
  ativo?: boolean;
  texto_modelo_md?: string;
  placeholders_schema_json?: unknown;
  observacoes?: string | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerSSR();
  const modeloId = Number(id);

  if (!Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contratos_modelo")
    .select("*")
    .eq("id", modeloId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await getSupabaseServerSSR();
  const modeloId = Number(id);

  if (!Number.isFinite(modeloId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ContratoModeloUpdatePayload;

  const updatePayload: Record<string, unknown> = {};
  if (typeof body.tipo_contrato === "string") updatePayload.tipo_contrato = body.tipo_contrato;
  if (typeof body.titulo === "string") updatePayload.titulo = body.titulo;
  if (typeof body.versao === "string") updatePayload.versao = body.versao;
  if (typeof body.ativo === "boolean") updatePayload.ativo = body.ativo;
  if (typeof body.texto_modelo_md === "string") updatePayload.texto_modelo_md = body.texto_modelo_md;
  if (typeof body.observacoes === "string" || body.observacoes === null) updatePayload.observacoes = body.observacoes;
  if (typeof body.placeholders_schema_json !== "undefined") {
    updatePayload.placeholders_schema_json = body.placeholders_schema_json;
  }

  const { data, error } = await supabase
    .from("contratos_modelo")
    .update(updatePayload)
    .eq("id", modeloId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
