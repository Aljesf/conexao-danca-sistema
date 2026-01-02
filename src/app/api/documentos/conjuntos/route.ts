import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ConjuntoCreate = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as ConjuntoCreate;

  if (!body?.codigo || !body?.nome) {
    return NextResponse.json(
      { ok: false, message: "Campos obrigatorios: codigo, nome." },
      { status: 400 }
    );
  }

  const payload = {
    codigo: normCodigo(body.codigo),
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    ativo: typeof body.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
