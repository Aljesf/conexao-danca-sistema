import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type TierGrupoRow = {
  tier_grupo_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("financeiro_tier_grupos")
    .select("tier_grupo_id,nome,descricao,ativo,created_at")
    .order("tier_grupo_id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ grupos: (data ?? []) as TierGrupoRow[] });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
    .from("financeiro_tier_grupos")
    .insert(payload)
    .select("tier_grupo_id,nome,descricao,ativo,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ grupo: data }, { status: 201 });
}
