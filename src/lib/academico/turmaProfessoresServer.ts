import { getSupabaseServer } from "@/lib/supabaseServer";
import type { TurmaProfessor } from "@/types/turmaProfessores";

export async function listarProfessoresDaTurma(turmaId: number) {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      `
        id,
        turma_id,
        colaborador_id,
        funcao_id,
        principal,
        data_inicio,
        data_fim,
        ativo,
        observacoes,
        colaboradores!inner (
          id,
          pessoa_id,
          pessoas!inner ( id, nome )
        ),
        funcao:funcoes_colaborador!inner ( id, nome )
      `
    )
    .eq("turma_id", turmaId)
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) throw error;
  return data as TurmaProfessor[];
}

export async function listarProfessoresAtivosSimples() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("vw_professores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("Erro ao listar professores ativos:", error);
    return [];
  }

  return data ?? [];
}
