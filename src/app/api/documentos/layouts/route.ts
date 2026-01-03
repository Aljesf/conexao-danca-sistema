import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("ativo") !== "0";

  const supabase = await getSupabaseServerSSR();

  let q = supabase
    .from("documentos_layouts")
    .select("layout_id,nome,tags,ativo,created_at")
    .order("nome", { ascending: true });

  if (onlyActive) q = q.eq("ativo", true);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as Record<string, unknown>;

  const nome = String(body.nome || "").trim();
  const tagsRaw = String(body.tags || "").trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const cabecalho_html = typeof body.cabecalho_html === "string" ? body.cabecalho_html : null;
  const rodape_html = typeof body.rodape_html === "string" ? body.rodape_html : null;

  if (!nome) {
    return NextResponse.json({ ok: false, message: "Nome e obrigatorio." } satisfies ApiResp<never>, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documentos_layouts")
    .insert({ nome, tags, cabecalho_html, rodape_html, ativo: true })
    .select("layout_id,nome")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 201 });
}
