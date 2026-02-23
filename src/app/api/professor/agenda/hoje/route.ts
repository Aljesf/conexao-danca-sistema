import { NextResponse, type NextRequest } from "next/server";
import { getColaboradorIdForUser, getUserOrThrow } from "../../diario-de-classe/_lib/auth";

type AgendaRow = {
  turma_id: number;
  turma_nome: string;
  hora_inicio: string | null;
  hora_fim: string | null;
};

type AulaHoje = {
  turma_id: number;
  turma_nome: string;
  hora_inicio: string;
  hora_fim: string;
};

export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { supabase, user } = auth;

  let professorId: number | null = null;
  try {
    professorId = await getColaboradorIdForUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_BUSCAR_COLABORADOR";
    return NextResponse.json({ error: "Falha ao mapear professor.", details: msg }, { status: 500 });
  }

  if (!professorId) {
    return NextResponse.json({ error: "Usuario nao vinculado a professor." }, { status: 403 });
  }

  const { data: rows, error: agendaError } = await supabase
    .from("vw_professor_agenda_hoje")
    .select("turma_id, turma_nome, hora_inicio, hora_fim")
    .eq("professor_id", professorId)
    .order("hora_inicio", { ascending: true });

  if (agendaError) {
    return NextResponse.json(
      { error: "Falha ao carregar agenda.", details: agendaError.message },
      { status: 500 },
    );
  }

  const aulas: AulaHoje[] = ((rows as AgendaRow[] | null) ?? []).map((r) => ({
    turma_id: Number(r.turma_id),
    turma_nome: String(r.turma_nome),
    hora_inicio: r.hora_inicio ? String(r.hora_inicio) : "",
    hora_fim: r.hora_fim ? String(r.hora_fim) : "",
  }));

  return NextResponse.json({ aulas }, { status: 200 });
}
