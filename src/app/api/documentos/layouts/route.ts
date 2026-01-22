import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("ativo") !== "0";

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

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

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
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

