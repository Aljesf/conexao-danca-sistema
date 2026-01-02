import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type GrupoPayload = {
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
  const conjuntoId = parseId(id);

  if (!conjuntoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos")
    .select("*")
    .eq("conjunto_id", conjuntoId)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conjuntoId = parseId(id);

  if (!conjuntoId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as GrupoPayload;

  if (!body?.codigo || !body?.nome) {
    return NextResponse.json({ error: "Campos obrigatorios: codigo, nome." }, { status: 400 });
  }

  const codigo = normalizeCodigo(body.codigo);
  if (!/^[A-Z0-9_]+$/.test(codigo)) {
    return NextResponse.json({ error: "Codigo invalido. Use A-Z, 0-9 e _." }, { status: 400 });
  }

  const ordem = typeof body.ordem === "number" && Number.isFinite(body.ordem) ? Math.trunc(body.ordem) : 1;

  const insertPayload = {
    conjunto_id: conjuntoId,
    codigo,
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    obrigatorio: typeof body.obrigatorio === "boolean" ? body.obrigatorio : false,
    ordem,
  };

  const { data, error } = await supabase
    .from("documentos_grupos")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
