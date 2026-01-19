import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professorId = Number(id);
  const body = await req.json();
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("professores")
    .update(body)
    .eq("id", professorId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professorId = Number(id);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("professores").delete().eq("id", professorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
