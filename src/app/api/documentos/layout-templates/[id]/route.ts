import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const layoutTemplateId = Number(id);

  if (!Number.isFinite(layoutTemplateId) || layoutTemplateId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("documentos_layout_templates")
    .select("layout_template_id,tipo,nome,tags,height_px,html,ativo,created_at,updated_at")
    .eq("layout_template_id", layoutTemplateId)
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const layoutTemplateId = Number(id);

  if (!Number.isFinite(layoutTemplateId) || layoutTemplateId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = (await req.json()) as Record<string, unknown>;

  const nome = String(body.nome || "").trim();
  const html = String(body.html || "");
  const heightPx = Number(body.height_px || 0);
  const tagsRaw = String(body.tags || "").trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const ativo = body.ativo !== false;

  if (!nome) {
    return NextResponse.json(
      { ok: false, message: "nome e obrigatorio." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    return NextResponse.json(
      { ok: false, message: "height_px invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("documentos_layout_templates")
    .update({
      nome,
      html,
      height_px: heightPx,
      tags,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("layout_template_id", layoutTemplateId)
    .select("layout_template_id,nome,ativo")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

