import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const PK = "politica_preco_id";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function mapPlano(row: Record<string, unknown>) {
  return { ...row, id: row[PK] };
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const url = new URL(req.url);
  const onlyAtivo = url.searchParams.get("ativo");

  let q = supabase.from("financeiro_politicas_preco").select("*");
  if (onlyAtivo === "true") q = q.eq("ativo", true);

  const { data, error } = await q.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const planos = (data ?? []).map((row) => mapPlano(row as Record<string, unknown>));
  return NextResponse.json({ planos });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json().catch(() => null)) as
    | { nome?: unknown; descricao?: unknown; ativo?: unknown }
    | null;

  if (!isNonEmptyString(body?.nome)) {
    return NextResponse.json({ error: "Campo 'nome' e obrigatorio." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    nome: body.nome.trim(),
  };

  if (typeof body?.descricao === "string") payload.descricao = body.descricao.trim();
  if (typeof body?.ativo === "boolean") payload.ativo = body.ativo;

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return NextResponse.json({ plano: mapPlano(row) }, { status: 201 });
}
