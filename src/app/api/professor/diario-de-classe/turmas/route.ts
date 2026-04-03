import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getColaboradorIdForUser, getUserOrThrow, isAdminUser } from "../_lib/auth";
import { getProfessorOperationalAccess } from "@/app/api/professor/_lib/operacional";
import { anexarResumoAlunosTurmas, carregarResumoAlunosTurmas } from "@/lib/academico/turmasResumoServer";
import { resolverHorarioTurma, type ResumoAlunosTurma } from "@/lib/turmas";

type Supa = SupabaseClient;

type TurmaRow = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  status: string | null;
  periodo_letivo_id: number | null;
  capacidade?: number | null;
  dias_semana?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  horarios?: Array<{ inicio?: string | null; fim?: string | null }> | null;
  resumo_alunos?: ResumoAlunosTurma | null;
};

type TurmaLinkRow = { turma: TurmaRow | null };

const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const zColabId = z.coerce.number().int().positive().optional();

function weekdayKeysFromISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  const weekday = date.getDay();
  const br3 = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"][weekday]!;
  const en3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][weekday]!;
  const brFull = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][weekday]!;
  return { br3, en3, brFull };
}

function normalizeWeekday(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function turmaTemAulaNoDia(dias: unknown, keys: { br3: string; en3: string; brFull: string }) {
  if (!Array.isArray(dias)) return false;
  const normalized = dias.map((item) => normalizeWeekday(String(item)));
  return normalized.includes(keys.br3) || normalized.includes(keys.en3) || normalized.includes(normalizeWeekday(keys.brFull));
}

function hydrateHorarioTurma<T extends TurmaRow>(turma: T): T {
  const horarioResolvido = resolverHorarioTurma({
    turma: {
      hora_inicio: turma.hora_inicio ?? null,
      hora_fim: turma.hora_fim ?? null,
    },
    horarios: turma.horarios ?? [],
  });

  return {
    ...turma,
    hora_inicio: horarioResolvido.hora_inicio,
    hora_fim: horarioResolvido.hora_fim,
  };
}

async function montarResposta(params: {
  turmas: TurmaRow[];
  supabase: Supa;
  scope: "own" | "all";
  podeVerTodasTurmas: boolean;
}) {
  const resumoByTurmaId = await carregarResumoAlunosTurmas(
    params.supabase,
    params.turmas.map((turma) => turma.turma_id),
  );

  return NextResponse.json({
    ok: true,
    scope: params.scope,
    pode_ver_todas_turmas: params.podeVerTodasTurmas,
    turmas: anexarResumoAlunosTurmas(params.turmas, resumoByTurmaId),
  });
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
  const professorColaboradorId = zColabId.safeParse(url.searchParams.get("professorColaboradorId") ?? undefined);
  const requestedScope = String(url.searchParams.get("scope") ?? "own").toLowerCase();

  let isAdmin = false;
  try {
    isAdmin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ ok: false, code: message }, { status: 500 });
  }

  let colaboradorId: number | null = null;
  try {
    colaboradorId = await getColaboradorIdForUser(supabase, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ERRO_BUSCAR_COLABORADOR";
    return NextResponse.json({ ok: false, code: message }, { status: 500 });
  }

  let podeVerOutrasTurmasPorPerfil = false;
  try {
    const access = await getProfessorOperationalAccess(user.id);
    podeVerOutrasTurmasPorPerfil = access.podeVerOutrasTurmas;
  } catch {
    podeVerOutrasTurmasPorPerfil = false;
  }

  const podeVerTodasTurmas = isAdmin || Boolean(colaboradorId) || podeVerOutrasTurmasPorPerfil;
  const defaultScopeAll = isAdmin || podeVerOutrasTurmasPorPerfil;
  const scopeAll = requestedScope === "all" ? podeVerTodasTurmas : defaultScopeAll;
  const scope = scopeAll ? "all" : "own";

  if (scope === "own" && !colaboradorId) {
    return NextResponse.json({ ok: true, scope, pode_ver_todas_turmas: podeVerTodasTurmas, turmas: [] });
  }

  if (scopeAll) {
    let turmaIds: number[] | null = null;

    if (professorColaboradorId.success && professorColaboradorId.data) {
      const { data: vinculos, error: vinculosError } = await supabase
        .from("turma_professores")
        .select("turma_id")
        .eq("colaborador_id", professorColaboradorId.data)
        .eq("ativo", true);

      if (vinculosError) {
        return NextResponse.json(
          { ok: false, code: "ERRO_VINCULO_PROF_TURMA", message: vinculosError.message },
          { status: 500 },
        );
      }

      turmaIds = (vinculos ?? []).map((row) => row.turma_id).filter((value): value is number => typeof value === "number");
      if (turmaIds.length === 0) {
        return NextResponse.json({ ok: true, scope, pode_ver_todas_turmas: podeVerTodasTurmas, turmas: [] });
      }
    }

    let query = supabase
      .from("turmas")
      .select(
        "turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id,capacidade,dias_semana,hora_inicio,hora_fim,horarios:turmas_horarios(inicio,fim)",
      )
      .order("hora_inicio", { ascending: true })
      .order("nome", { ascending: true });

    if (turmaIds) {
      query = query.in("turma_id", turmaIds);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, code: "ERRO_LISTAR_TURMAS", message: error.message }, { status: 500 });
    }

    let turmas = (data ?? []).map((turma) => hydrateHorarioTurma(turma as TurmaRow));
    if (date.success && date.data) {
      const keys = weekdayKeysFromISO(date.data);
      turmas = turmas.filter((turma) => turmaTemAulaNoDia(turma.dias_semana, keys));
    }

    return montarResposta({
      turmas,
      supabase,
      scope,
      podeVerTodasTurmas,
    });
  }

  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      "turma:turmas(turma_id,nome,curso,nivel,turno,ano_referencia,status,periodo_letivo_id,capacidade,dias_semana,hora_inicio,hora_fim,horarios:turmas_horarios(inicio,fim))",
    )
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true);

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_LISTAR_TURMAS_PROF", message: error.message }, { status: 500 });
  }

  const turmas = ((data as unknown as TurmaLinkRow[] | null) ?? [])
    .map((row) => row.turma)
    .filter((row): row is TurmaRow => Boolean(row))
    .map((row) => hydrateHorarioTurma(row));

  let turmasFiltradas = turmas;
  if (date.success && date.data) {
    const keys = weekdayKeysFromISO(date.data);
    turmasFiltradas = turmas.filter((turma) => turmaTemAulaNoDia(turma.dias_semana, keys));
  }

  return montarResposta({
    turmas: turmasFiltradas,
    supabase,
    scope,
    podeVerTodasTurmas,
  });
}
