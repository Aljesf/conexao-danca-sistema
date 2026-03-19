import type { SupabaseClient } from "@supabase/supabase-js";
import { getResumoAlunosTurma, type ResumoAlunosTurma } from "@/lib/turmas";

type ResumoTurmaDashboardRow = {
  turma_id: number | string;
  alunos_ativos_total: number | string | null;
  pagantes_total: number | string | null;
  concessao_total: number | string | null;
  concessao_integral_total: number | string | null;
  concessao_parcial_total: number | string | null;
  capacidade: number | string | null;
  vagas_disponiveis: number | string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function carregarResumoAlunosTurmas(
  supabase: SupabaseClient,
  turmaIds: number[],
): Promise<Map<number, ResumoAlunosTurma>> {
  const turmaIdsValidas = Array.from(
    new Set(
      turmaIds.filter((turmaId): turmaId is number => Number.isInteger(turmaId) && turmaId > 0),
    ),
  );

  if (turmaIdsValidas.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("vw_escola_dashboard_turmas_composicao")
    .select(
      [
        "turma_id",
        "alunos_ativos_total",
        "pagantes_total",
        "concessao_total",
        "concessao_integral_total",
        "concessao_parcial_total",
        "capacidade",
        "vagas_disponiveis",
      ].join(","),
    )
    .in("turma_id", turmaIdsValidas);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ResumoTurmaDashboardRow[]).map((row) => [
      toNumber(row.turma_id),
      getResumoAlunosTurma({
        total_alunos: toNumber(row.alunos_ativos_total),
        pagantes: toNumber(row.pagantes_total),
        concessao_total: toNumber(row.concessao_total),
        concessao_integral: toNumber(row.concessao_integral_total),
        concessao_parcial: toNumber(row.concessao_parcial_total),
        capacidade: toNullableNumber(row.capacidade),
        vagas_disponiveis: toNullableNumber(row.vagas_disponiveis),
      }),
    ]),
  );
}

export function anexarResumoAlunosTurmas<
  T extends {
    turma_id: number;
    capacidade?: number | null;
    resumo_alunos?: Partial<ResumoAlunosTurma> | null;
  },
>(turmas: T[], resumoByTurmaId: Map<number, ResumoAlunosTurma>): Array<T & { resumo_alunos: ResumoAlunosTurma }> {
  return turmas.map((turma) => {
    const resumoCarregado = resumoByTurmaId.get(Number(turma.turma_id));

    return {
      ...turma,
      resumo_alunos: getResumoAlunosTurma({
        ...(turma.resumo_alunos ?? {}),
        ...(resumoCarregado ?? {}),
        capacidade:
          resumoCarregado?.capacidade ??
          (turma.capacidade == null ? null : Number(turma.capacidade)),
      }),
    };
  });
}
