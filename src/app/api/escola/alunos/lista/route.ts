import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const limit = Math.min(toInt(url.searchParams.get("limit"), 50), 200);
  const offset = Math.max(toInt(url.searchParams.get("offset"), 0), 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("vw_alunos_canonico")
    .select("pessoa_id,nome,email,telefone,ativo", { count: "exact" })
    .order("nome", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search.length >= 2) {
    const s = search.replaceAll("%", "").replaceAll("_", "");
    query = query.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    meta: { limit, offset, count: count ?? 0 },
    data: data ?? [],
  });
}
