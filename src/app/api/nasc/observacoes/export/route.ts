import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

function clampDays(raw: string | null, def = 30) {
  const n = raw ? Number(raw) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(365, Math.trunc(n)));
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  const needs = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;

    const url = new URL(request.url);
    const days = clampDays(url.searchParams.get("days"), 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("nasc_observacoes")
      .select("id, created_at, created_by, app_context, pathname, full_url, page_title, entity_ref, observacao")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const header = [
      "id",
      "created_at",
      "created_by",
      "app_context",
      "pathname",
      "full_url",
      "page_title",
      "entity_ref",
      "observacao",
    ];

    const rows = (data ?? []).map((r) =>
      [
        r.id,
        r.created_at,
        r.created_by,
        r.app_context,
        r.pathname,
        r.full_url,
        r.page_title,
        r.entity_ref,
        r.observacao,
      ]
        .map(csvEscape)
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registro-observacoes-operacionais_${days}d.csv"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


