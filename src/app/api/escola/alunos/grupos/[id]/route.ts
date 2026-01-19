import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

type GrupoUpdate = {
  nome?: string;
  categoria?: string;
  subcategoria?: string | null;
  tipo?: "TEMPORARIO" | "DURADOURO";
  descricao?: string | null;
  ativo?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = Number(id);

  if (!Number.isFinite(grupoId)) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("aluno_grupos")
    .select("id,nome,categoria,subcategoria,tipo,descricao,ativo,data_inicio,data_fim,created_at,updated_at")
    .eq("id", grupoId)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = Number(id);

  if (!Number.isFinite(grupoId)) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  let body: GrupoUpdate;
  try {
    body = (await req.json()) as GrupoUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.nome === "string") payload.nome = body.nome.trim();
  if (typeof body.categoria === "string") payload.categoria = body.categoria.trim();
  if (body.subcategoria !== undefined) payload.subcategoria = body.subcategoria?.trim() ?? null;
  if (body.tipo !== undefined) payload.tipo = body.tipo;
  if (body.descricao !== undefined) payload.descricao = body.descricao ?? null;
  if (body.ativo !== undefined) payload.ativo = Boolean(body.ativo);
  if (body.data_inicio !== undefined) payload.data_inicio = body.data_inicio ?? null;
  if (body.data_fim !== undefined) payload.data_fim = body.data_fim ?? null;

  const { data, error } = await supabase
    .from("aluno_grupos")
    .update(payload)
    .eq("id", grupoId)
    .select("id,nome,categoria,subcategoria,tipo,descricao,ativo,data_inicio,data_fim,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = Number(id);

  if (!Number.isFinite(grupoId)) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  const { error } = await supabase.from("aluno_grupos").delete().eq("id", grupoId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
