import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

type Body = {
  titulo?: string;
  papel?: string | null;
  organizacao?: string | null;
  data_evento?: string | null;
  comprovante_url?: string | null;
  descricao?: string | null;
};

export async function PUT(req: Request, { params }: Params): Promise<Response> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titulo === "string") payload.titulo = body.titulo.trim();
  if (body.papel !== undefined) payload.papel = body.papel?.trim() ?? null;
  if (body.organizacao !== undefined) payload.organizacao = body.organizacao?.trim() ?? null;
  if (body.data_evento !== undefined) payload.data_evento = body.data_evento ?? null;
  if (body.comprovante_url !== undefined) payload.comprovante_url = body.comprovante_url?.trim() ?? null;
  if (body.descricao !== undefined) payload.descricao = body.descricao?.trim() ?? null;

  const { data, error } = await supabase
    .from("curriculo_experiencias_artisticas")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_: Request, { params }: Params): Promise<Response> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("curriculo_experiencias_artisticas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
