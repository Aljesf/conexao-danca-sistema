import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServerSSR";

// GET /api/teste -> lista até 50 registros
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("teste")
    .select("*")
    .order("id", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

// POST /api/teste -> insere { conteudo: "..." }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const texto = String(body?.conteudo ?? "").trim();
  if (!texto) {
    return NextResponse.json({ error: "conteudo obrigatório" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("teste").insert([{ conteudo: texto }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
