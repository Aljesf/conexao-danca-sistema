import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const layoutId = Number(id);
  if (!Number.isFinite(layoutId) || layoutId <= 0) {
    return NextResponse.json({ ok: false, message: "ID invalido." } satisfies ApiResp<never>, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_layouts")
    .select("layout_id,nome,tags,cabecalho_html,rodape_html,ativo,created_at,updated_at")
    .eq("layout_id", layoutId)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const layoutId = Number(id);
  if (!Number.isFinite(layoutId) || layoutId <= 0) {
    return NextResponse.json({ ok: false, message: "ID invalido." } satisfies ApiResp<never>, { status: 400 });
  }

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

  const cabecalho_html =
    typeof body.cabecalho_html === "string" || body.cabecalho_html === null ? body.cabecalho_html : undefined;
  const rodape_html =
    typeof body.rodape_html === "string" || body.rodape_html === null ? body.rodape_html : undefined;
  const ativo = body.ativo !== false;

  if (!nome) {
    return NextResponse.json({ ok: false, message: "Nome e obrigatorio." } satisfies ApiResp<never>, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    nome,
    tags,
    ativo,
    updated_at: new Date().toISOString(),
  };

  if (typeof cabecalho_html !== "undefined") updatePayload.cabecalho_html = cabecalho_html;
  if (typeof rodape_html !== "undefined") updatePayload.rodape_html = rodape_html;

  const { data, error } = await supabase
    .from("documentos_layouts")
    .update(updatePayload)
    .eq("layout_id", layoutId)
    .select("layout_id,nome,ativo")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}
