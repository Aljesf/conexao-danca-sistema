import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const supabase = await createClient();

  let query = supabase.from("enderecos_cidades").select("id,nome,uf").order("nome", { ascending: true }).limit(50);
  if (q) query = query.ilike("nome", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
