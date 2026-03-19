import { getSupabaseServer } from "@/lib/supabaseServer";
import { resolverHorarioTurma } from "@/lib/turmas";
import type { Turma, TurmaHorario, TipoTurma, StatusTurma } from "@/types/turmas";

export type AtualizarTurmaInput = {
  nome: string;
  curso?: string | null;
  nivel?: string | null;
  tipo_turma?: string | null;
  turno?: string | null;
  ano_referencia?: number | null;
  contexto_matricula_id?: number | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  carga_horaria_prevista?: number | null;
  frequencia_minima_percentual?: number | null;
  observacoes?: string | null;
};

export async function listarTurmas(params?: {
  tipo_turma?: TipoTurma;
  status?: StatusTurma;
  curso?: string;
}) {
  const supabase = await getSupabaseServer();

  let query = supabase
    .from("turmas")
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        tipo_turma,
        turno,
        ano_referencia,
        status,
        data_inicio,
        data_fim,
        dias_semana,
        hora_inicio,
        hora_fim,
        espaco_id,
        espaco:espacos ( id, nome, tipo, capacidade, local_id, local:locais ( id, nome, tipo ) ),
        carga_horaria_prevista,
        frequencia_minima_percentual,
        ativo
      `
    )
    .order("ano_referencia", { ascending: false })
    .order("nome", { ascending: true });

  if (params?.tipo_turma) {
    query = query.eq("tipo_turma", params.tipo_turma);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.curso) {
    query = query.ilike("curso", `%${params.curso}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar turmas:", error);
    return [];
  }

  const turmas = (data ?? []) as Turma[];
  if (turmas.length === 0) {
    return turmas;
  }

  const turmaIds = turmas.map((t) => Number(t.turma_id)).filter((id) => Number.isInteger(id) && id > 0);

  if (turmaIds.length === 0) {
    return turmas;
  }

  const { data: horarios, error: horariosError } = await supabase
    .from("turmas_horarios")
    .select("turma_id,inicio,fim")
    .in("turma_id", turmaIds);

  if (horariosError) {
    console.error("Erro ao carregar horarios das turmas:", horariosError);
    return turmas;
  }

  const horariosPorTurma = new Map<number, Array<{ inicio: string | null; fim: string | null }>>();
  for (const horario of horarios ?? []) {
    const turmaId = Number(horario.turma_id);
    if (!Number.isInteger(turmaId) || turmaId <= 0) continue;

    const lista = horariosPorTurma.get(turmaId) ?? [];
    lista.push({
      inicio: typeof horario.inicio === "string" ? horario.inicio : null,
      fim: typeof horario.fim === "string" ? horario.fim : null,
    });
    horariosPorTurma.set(turmaId, lista);
  }

  return turmas.map((t) => {
    const horarioResolvido = resolverHorarioTurma({
      turma: {
        hora_inicio: t.hora_inicio,
        hora_fim: t.hora_fim,
      },
      horarios: horariosPorTurma.get(Number(t.turma_id)) ?? [],
    });

    return {
      ...t,
      ...horarioResolvido,
      tem_horario: Boolean(horarioResolvido.hora_inicio && horarioResolvido.hora_fim),
    };
  });
}

export async function listarTurma(id: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas")
    .select("*")
    .eq("turma_id", id)
    .single();

  if (error) {
    console.error("Erro ao carregar turma:", error);
    throw error;
  }

  return data as Turma;
}

export async function listarHorariosDaTurma(turmaId: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas_horarios")
    .select("*")
    .eq("turma_id", turmaId)
    .order("day_of_week", { ascending: true })
    .order("inicio", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TurmaHorario[];
}

export async function obterTurmaPorId(turmaId: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas")
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        tipo_turma,
        turno,
        ano_referencia,
        status,
        data_inicio,
        data_fim,
        carga_horaria_prevista,
        frequencia_minima_percentual,
        contexto_matricula_id,
        observacoes,
        professor_id,
        espaco_id,
        espaco:espacos ( id, nome, tipo, capacidade, local_id, local:locais ( id, nome, tipo ) )
      `,
    )
    .eq("turma_id", turmaId)
    .single();

  if (error || !data) {
    console.error("[obterTurmaPorId] Erro ao carregar turma:", error);
    return null;
  }

  return data as Turma;
}

export async function atualizarTurma(turmaId: number, dados: AtualizarTurmaInput, userEmail?: string | null) {
  const supabase = await getSupabaseServer();

  const updatePayload = {
    ...dados,
    user_email: userEmail ?? null,
  };

  const { error, data } = await supabase
    .from("turmas")
    .update(updatePayload)
    .eq("turma_id", turmaId)
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        tipo_turma,
        turno,
        ano_referencia,
        status,
        data_inicio,
        data_fim,
        carga_horaria_prevista,
        frequencia_minima_percentual,
        contexto_matricula_id,
        observacoes,
        professor_id
      `,
    )
    .single();

  if (error) {
    console.error("[atualizarTurma] Erro:", error);
    throw new Error(error.message);
  }

  return data as Turma;
}
