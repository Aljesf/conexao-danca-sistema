type TurmaHorarioBase = {
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

type FaixaHorario = {
  inicio?: string | null;
  fim?: string | null;
};

export function normalizarHorarioCurto(value?: string | null): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null;

  return trimmed.slice(0, 5);
}

export function resolverHorarioTurma(params: {
  turma?: TurmaHorarioBase | null;
  horarios?: FaixaHorario[] | null;
}): { hora_inicio: string | null; hora_fim: string | null } {
  const horaInicio = normalizarHorarioCurto(params.turma?.hora_inicio);
  const horaFim = normalizarHorarioCurto(params.turma?.hora_fim);

  const horariosValidos = (params.horarios ?? [])
    .map((horario) => ({
      inicio: normalizarHorarioCurto(horario.inicio),
      fim: normalizarHorarioCurto(horario.fim),
    }))
    .filter(
      (horario): horario is { inicio: string; fim: string } =>
        Boolean(horario.inicio) && Boolean(horario.fim)
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));

  const fallbackInicio = horariosValidos[0]?.inicio ?? null;
  const fallbackFim = horariosValidos[horariosValidos.length - 1]?.fim ?? null;

  return {
    hora_inicio: horaInicio ?? fallbackInicio,
    hora_fim: horaFim ?? fallbackFim,
  };
}

export function formatarHorario(turma: TurmaHorarioBase | null | undefined): string {
  const horaInicio = normalizarHorarioCurto(turma?.hora_inicio);
  const horaFim = normalizarHorarioCurto(turma?.hora_fim);

  if (!horaInicio || !horaFim) {
    return "Nao definido";
  }

  return `${horaInicio} - ${horaFim}`;
}

export type ResumoAlunosTurma = {
  total_alunos: number;
  pagantes: number;
  concessao_total: number;
  concessao_integral: number;
  concessao_parcial: number;
  capacidade: number | null;
  vagas_disponiveis: number | null;
};

export function getResumoAlunosTurma(
  resumo?: Partial<ResumoAlunosTurma> | null,
): ResumoAlunosTurma {
  const total_alunos = Number(resumo?.total_alunos ?? 0);
  const pagantes = Number(resumo?.pagantes ?? 0);
  const concessao_integral = Number(resumo?.concessao_integral ?? 0);
  const concessao_parcial = Number(resumo?.concessao_parcial ?? 0);
  const concessao_total =
    resumo?.concessao_total != null
      ? Number(resumo.concessao_total)
      : concessao_integral + concessao_parcial;

  const capacidade =
    resumo?.capacidade == null ? null : Number(resumo.capacidade);

  const vagas_disponiveis =
    resumo?.vagas_disponiveis == null
      ? capacidade == null
        ? null
        : Math.max(capacidade - total_alunos, 0)
      : Number(resumo.vagas_disponiveis);

  return {
    total_alunos,
    pagantes,
    concessao_total,
    concessao_integral,
    concessao_parcial,
    capacidade,
    vagas_disponiveis,
  };
}
