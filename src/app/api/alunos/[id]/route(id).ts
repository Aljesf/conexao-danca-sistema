import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const body = await req.json();

  const patch: any = {};
  if ("nome" in body)            patch.nome_completo   = body.nome;
  if ("email" in body)           patch.email           = body.email ?? null;
  if ("telefone" in body)        patch.telefone1       = body.telefone ?? null;
  if ("data_nascimento" in body) patch.data_nascimento = body.data_nascimento ?? null;
  if ("ativo" in body)           patch.ativo_bool      = !!body.ativo;

  const { data, error } = await supabase
    .from("pessoa")
    .update(patch)
    .eq("pessoa_id", Number(id))
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  // "excluir" = inativar
  const { error } = await supabase
    .from("pessoa")
    .update({ ativo_bool: false })
    .eq("pessoa_id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

