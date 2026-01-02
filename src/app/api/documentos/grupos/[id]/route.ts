import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type GrupoUpdatePayload = {
  codigo?: string;
  nome?: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  ordem?: number;
};

function normalizeCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

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
    .from("documentos_grupos")
    .select("*")
    .eq("id", grupoId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as GrupoUpdatePayload;
  const updatePayload: Record<string, unknown> = {};

  if (typeof body.codigo === "string" && body.codigo.trim()) {
    const codigo = normalizeCodigo(body.codigo);
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      return NextResponse.json({ error: "Codigo invalido. Use A-Z, 0-9 e _." }, { status: 400 });
    }
    updatePayload.codigo = codigo;
  }

  if (typeof body.nome === "string") updatePayload.nome = body.nome.trim();
  if (typeof body.descricao === "string" || body.descricao === null) updatePayload.descricao = body.descricao;
  if (typeof body.obrigatorio === "boolean") updatePayload.obrigatorio = body.obrigatorio;
  if (typeof body.ordem === "number" && Number.isFinite(body.ordem)) {
    updatePayload.ordem = Math.trunc(body.ordem);
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos")
    .update(updatePayload)
    .eq("id", grupoId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = parseId(id);

  if (!grupoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { error } = await supabase.from("documentos_grupos").delete().eq("id", grupoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
