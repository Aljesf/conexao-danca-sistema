import { NextResponse } from "next/server";
import { getColaboradorIdForUser, getUserOrThrow, isAdminUser } from "../_lib/auth";

type TurmaRow = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  status: string | null;
  periodo_letivo_id: number | null;
};

type TurmaLinkRow = { turma: TurmaRow | null };

/**
 * GET /api/professor/diario-de-classe/turmas
 */
export async function GET() {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { supabase, user } = auth;

  let isAdmin = false;
  try {
    isAdmin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ ok: false, code: msg }, { status: 500 });
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id")
      .order("turma_id", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, code: "ERRO_LISTAR_TURMAS", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, turmas: data ?? [] });
  }

  let colaboradorId: number | null = null;
  try {
    colaboradorId = await getColaboradorIdForUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_BUSCAR_COLABORADOR";
    return NextResponse.json({ ok: false, code: msg }, { status: 500 });
  }

  if (!colaboradorId) {
    return NextResponse.json({ ok: true, turmas: [] });
  }

  const { data, error } = await supabase
    .from("turma_professores")
    .select("turma:turmas(turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id)")
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true)
    .order("turma_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_TURMAS_PROF", message: error.message },
      { status: 500 }
    );
  }

  const turmas = (data as TurmaLinkRow[] | null)
    ?.map((row) => row.turma)
    .filter((row): row is TurmaRow => Boolean(row)) ?? [];

  return NextResponse.json({ ok: true, turmas });
}
