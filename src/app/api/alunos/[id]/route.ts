import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../../lib/supabaseServerSSR";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: { id: string }}) {
  const id = Number(params.id);
  const body = await req.json();
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("alunos")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string }}) {
  const id = Number(params.id);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("alunos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

