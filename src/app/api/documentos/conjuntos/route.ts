import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ConjuntoPayload = {
  codigo?: string;
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
};

function normalizeCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as ConjuntoPayload;

  if (!body?.codigo || !body?.nome) {
    return NextResponse.json({ error: "Campos obrigatorios: codigo, nome." }, { status: 400 });
  }

  const codigo = normalizeCodigo(body.codigo);
  if (!/^[A-Z0-9_]+$/.test(codigo)) {
    return NextResponse.json({ error: "Codigo invalido. Use A-Z, 0-9 e _." }, { status: 400 });
  }

  const insertPayload = {
    codigo,
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    ativo: typeof body.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
