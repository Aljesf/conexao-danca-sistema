import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Turma, TurmaHorario, TipoTurma, StatusTurma } from "@/types/turmas";

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

  return (data ?? []) as Turma[];
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
