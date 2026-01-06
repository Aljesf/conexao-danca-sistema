import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function asNumberId(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("id invalido");
  return n;
}

type AutorizadoInput = {
  pessoa_autorizada_id: number;
  parentesco?: string | null;
  observacoes?: string | null;
};

type AutorizadoRow = {
  id: number;
  pessoa_cuidados_id: number;
  pessoa_autorizada_id: number;
  parentesco: string | null;
  observacoes: string | null;
  created_at: string;
  pessoa_autorizada: {
    id: number;
    nome: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);

    const supabase = await createClient();

    const { data: cuidados, error: cErr } = await supabase
      .from("pessoa_cuidados")
      .select("id")
      .eq("pessoa_id", pessoaId)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!cuidados?.id) return NextResponse.json({ items: [] });

    const { data, error } = await supabase
      .from("pessoa_cuidados_autorizados_busca")
      .select(
        `
        id,
        pessoa_cuidados_id,
        pessoa_autorizada_id,
        parentesco,
        observacoes,
        created_at,
        pessoa_autorizada:pessoas!pessoa_cuidados_autorizados_busca_pessoa_autorizada_id_fkey ( id, nome, telefone, email )
      `
      )
      .eq("pessoa_cuidados_id", cuidados.id)
      .order("id", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ items: (data ?? []) as AutorizadoRow[] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const body = (await req.json()) as AutorizadoInput;

    const autorizadoId = Number(body.pessoa_autorizada_id);
    if (!Number.isFinite(autorizadoId) || autorizadoId <= 0) {
      return NextResponse.json({ error: "pessoa_autorizada_id invalido" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: cuidados, error: cErr } = await supabase
      .from("pessoa_cuidados")
      .select("id")
      .eq("pessoa_id", pessoaId)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

    let cuidadosId = cuidados?.id ?? null;
    if (!cuidadosId) {
      const { data: novo, error: nErr } = await supabase
        .from("pessoa_cuidados")
        .insert({ pessoa_id: pessoaId })
        .select("id")
        .single();

      if (nErr) return NextResponse.json({ error: nErr.message }, { status: 400 });
      cuidadosId = novo.id;
    }

    const { data, error } = await supabase
      .from("pessoa_cuidados_autorizados_busca")
      .insert({
        pessoa_cuidados_id: cuidadosId,
        pessoa_autorizada_id: autorizadoId,
        parentesco: body.parentesco ?? null,
        observacoes: body.observacoes ?? null,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { id: number; parentesco?: string | null; observacoes?: string | null };

    const itemId = Number(body.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "id invalido" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_cuidados_autorizados_busca")
      .update({
        parentesco: body.parentesco ?? null,
        observacoes: body.observacoes ?? null,
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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

    const { error } = await supabase.from("pessoa_cuidados_autorizados_busca").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
