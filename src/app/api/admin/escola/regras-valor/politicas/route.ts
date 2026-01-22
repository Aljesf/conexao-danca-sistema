import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type PoliticaPrecoRow = {
  politica_preco_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .select("politica_preco_id,nome,descricao,ativo,created_at,updated_at")
    .order("politica_preco_id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ politicas: (data ?? []) as PoliticaPrecoRow[] });
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

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
    .select("politica_preco_id,nome,descricao,ativo,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ politica: data }, { status: 201 });
}

