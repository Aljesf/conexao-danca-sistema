import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type Turma = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  periodo_letivo_id: number | null;
  status: string | null;
};

type TurmaHorario = {
  id: number;
  turma_id: number;
  day_of_week: number;
  inicio: string;
  fim: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodoLetivoId = searchParams.get("periodo_letivo_id");

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  let turmasQ = supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,ano_referencia,periodo_letivo_id,status")
    .order("turma_id", { ascending: false });

  if (periodoLetivoId) turmasQ = turmasQ.eq("periodo_letivo_id", Number(periodoLetivoId));

  const { data: turmas, error: turmasErr } = await turmasQ;
  if (turmasErr) return NextResponse.json({ error: turmasErr.message }, { status: 500 });

  const turmaIds = (turmas ?? []).map((t: Turma) => t.turma_id).filter(Boolean);

  const { data: horarios, error: horariosErr } = await supabase
    .from("turmas_horarios")
    .select("id,turma_id,day_of_week,inicio,fim")
    .in("turma_id", turmaIds.length ? turmaIds : [-1]);

  if (horariosErr) return NextResponse.json({ error: horariosErr.message }, { status: 500 });

  return NextResponse.json({
    periodo_letivo_id: periodoLetivoId ? Number(periodoLetivoId) : null,
    turmas: (turmas ?? []) as Turma[],
    horarios: (horarios ?? []) as TurmaHorario[],
  });
}

