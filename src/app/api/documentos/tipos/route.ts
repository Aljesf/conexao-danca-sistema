import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("ativo") !== "0";
  const supabase = await getSupabaseServerSSR();

  let query = supabase
    .from("documentos_tipos")
    .select("tipo_documento_id,codigo,nome,descricao,ativo,created_at,updated_at")
    .order("nome", { ascending: true });

  if (onlyActive) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as Record<string, unknown>;

  const codigo = String(body.codigo ?? "").trim().toUpperCase();
  const nome = String(body.nome ?? "").trim();
  const descricao = typeof body.descricao === "string" ? body.descricao.trim() : null;
  const ativo = body.ativo !== false;

  if (!codigo || !nome) {
    return NextResponse.json(
      { ok: false, message: "Codigo e nome sao obrigatorios." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("documentos_tipos")
    .insert({ codigo, nome, descricao, ativo })
    .select("tipo_documento_id,codigo,nome,descricao,ativo")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 201 });
}
