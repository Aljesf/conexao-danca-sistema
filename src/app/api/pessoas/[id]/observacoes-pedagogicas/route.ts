import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function asNumberId(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("id invalido");
  return n;
}

type ObservacaoPedagogicaInput = {
  observado_em?: string | null;
  professor_pessoa_id?: number | null;
  titulo?: string | null;
  descricao: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_observacoes_pedagogicas")
      .select(
        `
        id,
        pessoa_id,
        observado_em,
        professor_pessoa_id,
        titulo,
        descricao,
        created_at,
        professor:pessoas!pessoa_observacoes_pedagogicas_professor_pessoa_id_fkey ( id, nome )
      `
      )
      .eq("pessoa_id", pessoaId)
      .order("observado_em", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);

    const body = (await req.json()) as ObservacaoPedagogicaInput;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_observacoes_pedagogicas")
      .insert({
        pessoa_id: pessoaId,
        observado_em: body.observado_em ?? new Date().toISOString(),
        professor_pessoa_id: body.professor_pessoa_id ?? null,
        titulo: body.titulo ?? null,
        descricao: body.descricao,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as ObservacaoPedagogicaInput & {
      id: number;
    };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_observacoes_pedagogicas")
      .update({
        observado_em: body.observado_em ?? new Date().toISOString(),
        professor_pessoa_id: body.professor_pessoa_id ?? null,
        titulo: body.titulo ?? null,
        descricao: body.descricao,
      })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = asNumberId(String(searchParams.get("id") ?? ""));

    const supabase = await createClient();

    const { error } = await supabase
      .from("pessoa_observacoes_pedagogicas")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
