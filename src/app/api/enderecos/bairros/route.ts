import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cidadeId = Number(searchParams.get("cidade_id") ?? "");
  const q = (searchParams.get("q") ?? "").trim();

  if (!Number.isFinite(cidadeId) || cidadeId <= 0) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await createClient();

  let query = supabase
    .from("enderecos_bairros")
    .select("id,nome,cidade_id")
    .eq("cidade_id", cidadeId)
    .order("nome", { ascending: true })
    .limit(100);

  if (q) query = query.ilike("nome", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
