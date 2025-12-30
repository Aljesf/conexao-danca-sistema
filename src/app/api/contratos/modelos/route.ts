import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ContratoModeloPayload = {
  tipo_contrato: string;
  titulo: string;
  versao?: string;
  ativo?: boolean;
  texto_modelo_md: string;
  placeholders_schema_json?: unknown;
  observacoes?: string | null;
};

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("contratos_modelo")
    .select("*")
    .order("tipo_contrato", { ascending: true })
    .order("titulo", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as ContratoModeloPayload;

  if (!body?.tipo_contrato || !body?.titulo || !body?.texto_modelo_md) {
    return NextResponse.json(
      { error: "Campos obrigatorios: tipo_contrato, titulo, texto_modelo_md." },
      { status: 400 },
    );
  }

  const insertPayload = {
    tipo_contrato: body.tipo_contrato,
    titulo: body.titulo,
    versao: body.versao ?? "v1.0",
    ativo: body.ativo ?? true,
    texto_modelo_md: body.texto_modelo_md,
    placeholders_schema_json: body.placeholders_schema_json ?? [],
    observacoes: body.observacoes ?? null,
  };

  const { data, error } = await supabase
    .from("contratos_modelo")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
