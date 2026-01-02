import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type GrupoCreate = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  ordem?: number;
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conjuntoId = Number(id);

  if (!Number.isFinite(conjuntoId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos")
    .select("*")
    .eq("conjunto_id", conjuntoId)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conjuntoId = Number(id);

  if (!Number.isFinite(conjuntoId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as GrupoCreate;
  if (!body?.codigo || !body?.nome) {
    return NextResponse.json({ ok: false, message: "Campos obrigatorios: codigo, nome." }, { status: 400 });
  }

  const payload = {
    conjunto_id: conjuntoId,
    codigo: normCodigo(body.codigo),
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    obrigatorio: typeof body.obrigatorio === "boolean" ? body.obrigatorio : false,
    ordem: Number.isFinite(Number(body.ordem)) ? Number(body.ordem) : 1,
  };

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
