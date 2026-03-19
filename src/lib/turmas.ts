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
