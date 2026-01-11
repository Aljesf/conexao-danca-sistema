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
    .from("curriculo_experiencias_artisticas")
    .select("id,pessoa_id,titulo,papel,organizacao,data_evento,descricao,comprovante_url,created_at,updated_at")
    .eq("pessoa_id", pessoaId)
    .order("data_evento", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

type Body = {
  pessoa_id: number;
  titulo: string;
  papel?: string | null;
  organizacao?: string | null;
  data_evento?: string | null;
  descricao?: string | null;
  comprovante_url?: string | null;
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

  if (!body?.titulo?.trim()) {
    return NextResponse.json({ ok: false, error: "titulo e obrigatorio." }, { status: 400 });
  }

  const payload = {
    pessoa_id: body.pessoa_id,
    titulo: body.titulo.trim(),
    papel: body.papel?.trim() ?? null,
    organizacao: body.organizacao?.trim() ?? null,
    data_evento: body.data_evento ?? null,
    descricao: body.descricao?.trim() ?? null,
    comprovante_url: body.comprovante_url?.trim() ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("curriculo_experiencias_artisticas")
    .insert(payload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
