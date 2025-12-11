// src/app/api/turmas/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await getSupabaseServer();
  const body = await _req.json(); // { turma: {...}, horarios: [...] }

  // atualiza turma
  const { data, error } = await supabase
    .from("turmas")
    .update(body.turma)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // substitui horários
  if (Array.isArray(body.horarios)) {
    await supabase.from("turmas_horarios").delete().eq("turma_id", id);

    const rows = body.horarios.map((h: any) => ({
      turma_id: id,
      day_of_week: h.day,
      inicio: h.inicio,
      fim: h.fim,
    }));

    const { error: e2 } = await supabase.from("turmas_horarios").insert(rows);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("turmas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


