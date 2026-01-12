import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type CreatePayload = {
  app_context?: string | null;
  pathname?: string | null;
  full_url?: string | null;
  page_title?: string | null;
  entity_ref?: string | null;
  observacao: string;
  user_agent?: string | null;
  viewport_json?: Record<string, unknown> | null;
  context_json?: Record<string, unknown> | null;
};

function clampLimit(raw: string | null, def = 200) {
  const n = raw ? Number(raw) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(1000, Math.trunc(n)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get("limit"), 200);

    const { data, error } = await supabase
      .from("nasc_observacoes")
      .select(
        "id, created_at, created_by, app_context, pathname, full_url, page_title, entity_ref, observacao, user_agent, viewport_json, context_json",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CreatePayload>;
    const observacao = (body.observacao ?? "").trim();

    if (!observacao) {
      return NextResponse.json({ ok: false, error: "observacao_obrigatoria" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      created_by: user.id,
      app_context: body.app_context ?? null,
      pathname: body.pathname ?? null,
      full_url: body.full_url ?? null,
      page_title: body.page_title ?? null,
      entity_ref: body.entity_ref ?? null,
      observacao,
      user_agent: body.user_agent ?? null,
      viewport_json: isRecord(body.viewport_json) ? body.viewport_json : {},
      context_json: isRecord(body.context_json) ? body.context_json : {},
    };

    const { data, error } = await supabase
      .from("nasc_observacoes")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
