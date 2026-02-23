import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const STATUS_VALUES = ["ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"] as const;

function clampLimit(raw: string | null, def = 200) {
  const n = raw ? Number(raw) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(500, Math.trunc(n)));
}

function normalizeStatus(raw: string | null): (typeof STATUS_VALUES)[number] | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  return STATUS_VALUES.includes(normalized as (typeof STATUS_VALUES)[number])
    ? (normalized as (typeof STATUS_VALUES)[number])
    : null;
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseServiceClient();
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get("status"));
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = clampLimit(url.searchParams.get("limit"), 200);

    let query = supabase
      .from("nasc_observacoes")
      .select("id,created_at,updated_at,created_by,pathname,page_title,observacao,status,triagem_notas")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("observacao", `%${q}%`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar", details: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const userIds = Array.from(
      new Set(
        rows
          .map((row) => row.created_by)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const namesByUserId = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", userIds);

      (profiles ?? []).forEach((p) => {
        const userId = typeof p.user_id === "string" ? p.user_id : null;
        if (!userId) return;
        namesByUserId.set(userId, typeof p.full_name === "string" ? p.full_name : null);
      });
    }

    const items = rows.map((row) => ({
      ...row,
      created_by_name:
        typeof row.created_by === "string" ? (namesByUserId.get(row.created_by) ?? null) : null,
    }));

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
