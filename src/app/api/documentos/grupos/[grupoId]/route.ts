import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type GrupoUpdate = {
  codigo?: string;
  nome?: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  ordem?: number;
  papel?: "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL";
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

const PAPEIS_VALIDOS = ["PRINCIPAL", "OBRIGATORIO", "OPCIONAL", "ADICIONAL"] as const;

export async function GET(_: Request, ctx: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await ctx.params;
  const id = Number(grupoId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_grupos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await ctx.params;
  const id = Number(grupoId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as GrupoUpdate;
  const patch: Record<string, unknown> = {};

  if (typeof body.codigo === "string") patch.codigo = normCodigo(body.codigo);
  if (typeof body.nome === "string") patch.nome = body.nome.trim();
  if (typeof body.descricao === "string" || body.descricao === null) patch.descricao = body.descricao;
  if (typeof body.obrigatorio === "boolean") patch.obrigatorio = body.obrigatorio;
  if (typeof body.ordem !== "undefined") {
    const n = Number(body.ordem);
    if (Number.isFinite(n)) patch.ordem = n;
  }
  if (typeof body.papel === "string") {
    if (!PAPEIS_VALIDOS.includes(body.papel)) {
      return NextResponse.json({ ok: false, message: "Papel invalido." }, { status: 400 });
    }
    patch.papel = body.papel;
  }

  const supabase = await getSupabaseServerSSR();
  if (body.papel === "PRINCIPAL") {
    const { data: grupoAtual, error: grupoErr } = await supabase
      .from("documentos_grupos")
      .select("id,conjunto_id")
      .eq("id", id)
      .single();

    if (grupoErr || !grupoAtual) {
      return NextResponse.json({ ok: false, message: "Grupo nao encontrado." }, { status: 404 });
    }

    const { data: existente, error: principalErr } = await supabase
      .from("documentos_grupos")
      .select("id")
      .eq("conjunto_id", grupoAtual.conjunto_id)
      .eq("papel", "PRINCIPAL")
      .neq("id", id)
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
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}
