import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pessoaId = Number(url.searchParams.get("pessoa_id"));

  if (!Number.isFinite(pessoaId)) {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("curriculo_formacoes_externas")
    .select(
      "id,pessoa_id,nome_curso,organizacao,local,carga_horaria,data_inicio,data_fim,certificado_url,observacoes,created_at,updated_at",
    )
    .eq("pessoa_id", pessoaId)
    .order("data_fim", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

type Body = {
  pessoa_id: number;
  nome_curso: string;
  organizacao?: string | null;
  local?: string | null;
  carga_horaria?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  certificado_url?: string | null;
  observacoes?: string | null;
};

export async function POST(req: Request): Promise<Response> {
  const supabase = createAdminClient();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.pessoa_id || typeof body.pessoa_id !== "number") {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  if (!body?.nome_curso?.trim()) {
    return NextResponse.json({ ok: false, error: "nome_curso e obrigatorio." }, { status: 400 });
  }

  const payload = {
    pessoa_id: body.pessoa_id,
    nome_curso: body.nome_curso.trim(),
    organizacao: body.organizacao?.trim() ?? null,
    local: body.local?.trim() ?? null,
    carga_horaria: body.carga_horaria?.trim() ?? null,
    data_inicio: body.data_inicio ?? null,
    data_fim: body.data_fim ?? null,
    certificado_url: body.certificado_url?.trim() ?? null,
    observacoes: body.observacoes?.trim() ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("curriculo_formacoes_externas")
    .insert(payload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
