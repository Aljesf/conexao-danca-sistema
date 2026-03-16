import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
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
  dias_semana?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

type TurmaLinkRow = { turma: TurmaRow | null };

const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const zColabId = z.coerce.number().int().positive().optional();

function weekdayKeysFromISO(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  const wd = d.getDay();
  const br3 = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"][wd]!;
  const en3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][wd]!;
  const brFull = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][wd]!;
  return { br3, en3, brFull };
}

function normalizeWeekday(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function turmaTemAulaNoDia(dias: unknown, keys: { br3: string; en3: string; brFull: string }): boolean {
  if (!Array.isArray(dias)) return false;
  const norm = dias.map((x) => normalizeWeekday(String(x)));
  if (norm.includes(keys.br3)) return true;
  if (norm.includes(keys.en3)) return true;
  if (norm.includes(normalizeWeekday(keys.brFull))) return true;
  return false;
}

/**
 * GET /api/professor/diario-de-classe/turmas
 */
export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { supabase, user } = auth;

  const url = new URL(request.url);
  const date = zDate.safeParse(url.searchParams.get("date") ?? undefined);
  const professorColaboradorId = zColabId.safeParse(
    url.searchParams.get("professorColaboradorId") ?? undefined
  );

  let isAdmin = false;
  try {
    isAdmin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ ok: false, code: msg }, { status: 500 });
  }

  if (isAdmin) {
    let turmaIds: number[] | null = null;
    if (professorColaboradorId.success && professorColaboradorId.data) {
      const { data: vinc, error: vincErr } = await supabase
        .from("turma_professores")
        .select("turma_id")
        .eq("colaborador_id", professorColaboradorId.data)
        .eq("ativo", true);

      if (vincErr) {
        return NextResponse.json(
          { ok: false, code: "ERRO_VINCULO_PROF_TURMA", message: vincErr.message },
          { status: 500 }
        );
      }

      turmaIds = (vinc ?? []).map((r) => r.turma_id).filter((x): x is number => typeof x === "number");
      if (turmaIds.length === 0) return NextResponse.json({ ok: true, turmas: [] });
    }

    let q = supabase
      .from("turmas")
      .select("turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id,dias_semana,hora_inicio,hora_fim")
      .order("turma_id", { ascending: true });

    if (turmaIds) q = q.in("turma_id", turmaIds);

    const { data, error } = await q;

    if (error) {
      return NextResponse.json(
        { ok: false, code: "ERRO_LISTAR_TURMAS", message: error.message },
        { status: 500 }
      );
    }

    let turmas = data ?? [];
    if (date.success && date.data) {
      const keys = weekdayKeysFromISO(date.data);
      turmas = turmas.filter((t) => turmaTemAulaNoDia(t.dias_semana, keys));
    }

    return NextResponse.json({ ok: true, turmas });
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
    .select(
      "turma:turmas(turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id,dias_semana,hora_inicio,hora_fim)"
    )
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true)
    .order("turma_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_TURMAS_PROF", message: error.message },
      { status: 500 }
    );
  }

  const turmas = (data as unknown as TurmaLinkRow[] | null)
    ?.map((row) => row.turma)
    .filter((row): row is TurmaRow => Boolean(row)) ?? [];

  let turmasFiltradas = turmas;
  if (date.success && date.data) {
    const keys = weekdayKeysFromISO(date.data);
    turmasFiltradas = turmas.filter((t) => turmaTemAulaNoDia(t.dias_semana, keys));
  }

  return NextResponse.json({ ok: true, turmas: turmasFiltradas });
}
