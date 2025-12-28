import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type PoliticaPrecoRow = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .select("id,nome,descricao,ativo,created_at,updated_at")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ politicas: (data ?? []) as PoliticaPrecoRow[] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();

  const body = (await req.json().catch(() => null)) as
    | { nome?: unknown; descricao?: unknown; ativo?: unknown }
    | null;

  const nome = body?.nome;
  const descricao = body?.descricao;
  const ativo = body?.ativo;

  if (!isNonEmptyString(nome)) {
    return NextResponse.json({ error: "Campo 'nome' e obrigatorio." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    nome: nome.trim(),
  };

  if (typeof descricao === "string") payload.descricao = descricao.trim();
  if (typeof ativo === "boolean") payload.ativo = ativo;

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .insert(payload)
    .select("id,nome,descricao,ativo,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ politica: data }, { status: 201 });
}
