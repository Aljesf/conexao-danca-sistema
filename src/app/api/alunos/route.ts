import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabaseServerSSR";

export const dynamic = "force-dynamic";   // ⬅️ obrigatório ao usar cookies no handler
export const runtime = "nodejs";          // opcional, mas ajuda

export async function GET() {
  const supabase = await getSupabaseServer();      // ⬅️ await
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .order("id", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const { nome, email, telefone, data_nascimento } = await req.json();
  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  const supabase = await getSupabaseServer();      // ⬅️ await
  const { data, error } = await supabase
    .from("alunos")
    .insert([{ nome, email, telefone, data_nascimento }])
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
