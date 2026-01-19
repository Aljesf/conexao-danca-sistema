import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

type AddMembroBody = {
  pessoa_id: number;
  observacoes?: string | null;
};

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = Number(id);

  if (!Number.isFinite(grupoId)) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }

  let body: AddMembroBody;
  try {
    body = (await req.json()) as AddMembroBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.pessoa_id || typeof body.pessoa_id !== "number") {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const payload = {
    grupo_id: grupoId,
    pessoa_id: body.pessoa_id,
    status: "ATIVO",
    observacoes: body.observacoes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("aluno_grupo_membros")
    .upsert(payload, { onConflict: "grupo_id,pessoa_id" })
    .select("id,grupo_id,pessoa_id,status,data_entrada,data_saida,observacoes,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  const url = new URL(req.url);
  const pessoaId = Number(url.searchParams.get("pessoa_id"));
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = Number(id);

  if (!Number.isFinite(grupoId)) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }
  if (!Number.isFinite(pessoaId)) {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const { error } = await supabase
    .from("aluno_grupo_membros")
    .delete()
    .eq("grupo_id", grupoId)
    .eq("pessoa_id", pessoaId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
