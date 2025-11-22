// src/app/api/turmas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServerSSR";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("turmas")
    .select(`
      id,
      nome,
      nivel,
      modalidade,
      capacidade,
      ativo,
      created_at,
      user_email,
      particular,
      passe_livre,
      online,
      professor_id,
      professor:pessoas ( id, nome, email ),
      horarios:turmas_horarios ( day_of_week, inicio, fim )
    `)
    .order("id", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const payload = await req.json(); // { turma: {...}, horarios: [{day,inicio,fim}, ...] }

  // 1) cria turma
  const { data: turma, error } = await supabase
    .from("turmas")
    .insert([payload.turma])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) insere horários (se vier)
  if (Array.isArray(payload.horarios) && payload.horarios.length) {
    const rows = payload.horarios.map((h: any) => ({
      turma_id: turma.id,
      day_of_week: h.day,
      inicio: h.inicio,
      fim: h.fim,
    }));

    const { error: errH } = await supabase.from("turmas_horarios").insert(rows);

    if (errH) {
      return NextResponse.json({ error: errH.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data: turma }, { status: 201 });
}
