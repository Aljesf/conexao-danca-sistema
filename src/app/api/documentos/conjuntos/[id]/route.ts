import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ConjuntoUpdate = {
  codigo?: string;
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conjuntoId = Number(id);

  if (!Number.isFinite(conjuntoId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .select("*")
    .eq("id", conjuntoId)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conjuntoId = Number(id);

  if (!Number.isFinite(conjuntoId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ConjuntoUpdate;
  const patch: Record<string, unknown> = {};

  if (typeof body.codigo === "string") patch.codigo = normCodigo(body.codigo);
  if (typeof body.nome === "string") patch.nome = body.nome.trim();
  if (typeof body.descricao === "string" || body.descricao === null) patch.descricao = body.descricao;
  if (typeof body.ativo === "boolean") patch.ativo = body.ativo;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .update(patch)
    .eq("id", conjuntoId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}





