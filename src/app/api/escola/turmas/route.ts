import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { listTurmasLeves } from "@/lib/academico/turmas-operacional";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const filtros = {
    q: request.nextUrl.searchParams.get("q")?.trim() ?? "",
    curso: request.nextUrl.searchParams.get("curso")?.trim() ?? "",
    nivel: request.nextUrl.searchParams.get("nivel")?.trim() ?? "",
    turno: request.nextUrl.searchParams.get("turno")?.trim() ?? "",
    status: request.nextUrl.searchParams.get("status")?.trim() ?? "",
  };

  try {
    const turmas = await listTurmasLeves({
      supabase: auth.supabase,
      userId: auth.userId,
    });

    const filtradas = turmas.filter((turma) => {
      const matchesQ =
        !filtros.q ||
        [
          turma.nome,
          turma.curso,
          turma.nivel,
          turma.turno,
          turma.professor_principal,
          turma.grade_horario,
        ]
          .map(normalizeText)
          .some((value) => value.includes(normalizeText(filtros.q)));

      const matchesCurso = !filtros.curso || normalizeText(turma.curso).includes(normalizeText(filtros.curso));
      const matchesNivel = !filtros.nivel || normalizeText(turma.nivel).includes(normalizeText(filtros.nivel));
      const matchesTurno = !filtros.turno || normalizeText(turma.turno) === normalizeText(filtros.turno);
      const matchesStatus = !filtros.status || normalizeText(turma.status) === normalizeText(filtros.status);

      return matchesQ && matchesCurso && matchesNivel && matchesTurno && matchesStatus;
    });

    return NextResponse.json(
      {
        ok: true,
        filtros,
        turmas: filtradas.map((turma) => ({
          turma_id: turma.turma_id,
          nome: turma.nome,
          curso: turma.curso,
          nivel: turma.nivel,
          turno: turma.turno,
          status: turma.status,
          professor_principal: turma.professor_principal,
          grade_horario: turma.grade_horario,
          total_alunos: turma.total_alunos,
          ano_referencia: turma.ano_referencia,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_LISTAR_TURMAS_ESCOLA";
    return NextResponse.json({ ok: false, code: "ERRO_LISTAR_TURMAS_ESCOLA", message }, { status: 500 });
  }
}
