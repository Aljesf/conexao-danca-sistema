"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type TurmaProfessor = {
  id: number;
  turma_id: number;
  colaborador_id: number;
  funcao_id: number;
  principal: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
  observacoes: string | null;
};

export async function listarProfessoresDaTurma(
  turmaId: number,
): Promise<TurmaProfessor[]> {
  const supabase = await getSupabaseServer();

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
        observacoes
      `,
    )
    .eq("turma_id", turmaId)
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    // Log mais robusto para depuração sem quebrar a página
    console.error("[listarProfessoresDaTurma] Erro:", error, "raw:", JSON.stringify(error));
    // Por enquanto, não vamos derrubar a página da turma por causa disso
    return [];
  }

  return (data as TurmaProfessor[]) ?? [];
}
