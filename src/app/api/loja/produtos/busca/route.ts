import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("loja_produtos")
    .select("id,nome,codigo")
    .or(`nome.ilike.${like},codigo.ilike.${like}`)
    .order("nome", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}
