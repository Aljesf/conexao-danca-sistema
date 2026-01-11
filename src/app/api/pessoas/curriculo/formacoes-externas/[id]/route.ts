import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

type Body = {
  nome_curso?: string;
  organizacao?: string | null;
  local?: string | null;
  carga_horaria?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  certificado_url?: string | null;
  observacoes?: string | null;
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
  if (typeof body.nome_curso === "string") payload.nome_curso = body.nome_curso.trim();
  if (body.organizacao !== undefined) payload.organizacao = body.organizacao?.trim() ?? null;
  if (body.local !== undefined) payload.local = body.local?.trim() ?? null;
  if (body.carga_horaria !== undefined) payload.carga_horaria = body.carga_horaria?.trim() ?? null;
  if (body.data_inicio !== undefined) payload.data_inicio = body.data_inicio ?? null;
  if (body.data_fim !== undefined) payload.data_fim = body.data_fim ?? null;
  if (body.certificado_url !== undefined) payload.certificado_url = body.certificado_url?.trim() ?? null;
  if (body.observacoes !== undefined) payload.observacoes = body.observacoes?.trim() ?? null;

  const { data, error } = await supabase
    .from("curriculo_formacoes_externas")
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

  const { error } = await supabase.from("curriculo_formacoes_externas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
