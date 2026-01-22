import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tipo = String(url.searchParams.get("tipo") || "")
    .trim()
    .toUpperCase();
  const onlyActive = url.searchParams.get("ativo") !== "0";

  if (tipo && tipo !== "HEADER" && tipo !== "FOOTER") {
    return NextResponse.json(
      { ok: false, message: "tipo invalido (HEADER/FOOTER)." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  let q = supabase
    .from("documentos_layout_templates")
    .select("layout_template_id,tipo,nome,tags,height_px,ativo,created_at,updated_at")
    .order("nome", { ascending: true });

  if (tipo) q = q.eq("tipo", tipo);
  if (onlyActive) q = q.eq("ativo", true);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = (await req.json()) as Record<string, unknown>;

  const tipo = String(body.tipo || "")
    .trim()
    .toUpperCase();
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

  if (tipo !== "HEADER" && tipo !== "FOOTER") {
    return NextResponse.json(
      { ok: false, message: "tipo deve ser HEADER ou FOOTER." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }
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
    .insert({ tipo, nome, html, height_px: heightPx, tags, ativo })
    .select("layout_template_id,nome")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message } satisfies ApiResp<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 201 });
}

