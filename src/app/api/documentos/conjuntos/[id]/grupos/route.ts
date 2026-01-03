import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type GrupoCreate = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  ordem?: number;
  ativo?: boolean;
  papel?: "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL";
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

const PAPEIS_VALIDOS = ["PRINCIPAL", "OBRIGATORIO", "OPCIONAL", "ADICIONAL"] as const;

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

  if (body.papel && !PAPEIS_VALIDOS.includes(body.papel)) {
    return NextResponse.json({ ok: false, message: "Papel invalido." }, { status: 400 });
  }

  const obrigatorio = typeof body.obrigatorio === "boolean" ? body.obrigatorio : false;
  const papel = body.papel ?? (obrigatorio ? "OBRIGATORIO" : "OPCIONAL");
  const ativo = typeof body.ativo === "boolean" ? body.ativo : true;

  const payload = {
    conjunto_id: conjuntoId,
    codigo: normCodigo(body.codigo),
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    obrigatorio,
    ativo,
    ordem: Number.isFinite(Number(body.ordem)) ? Number(body.ordem) : 1,
    papel,
  };

  const supabase = await getSupabaseServerSSR();
  if (papel === "PRINCIPAL") {
    const { data: existente, error: principalErr } = await supabase
      .from("documentos_grupos")
      .select("id")
      .eq("conjunto_id", conjuntoId)
      .eq("papel", "PRINCIPAL")
      .limit(1);

    if (principalErr) {
      return NextResponse.json({ ok: false, message: principalErr.message }, { status: 500 });
    }

    if ((existente ?? []).length > 0) {
      return NextResponse.json(
        { ok: false, message: "Ja existe um grupo PRINCIPAL neste conjunto." },
        { status: 400 },
      );
    }
  }

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
