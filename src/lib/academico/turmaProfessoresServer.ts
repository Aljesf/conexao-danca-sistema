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
  nome_pessoa?: string | null;
  funcao_nome?: string | null;
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
        observacoes,
        colaborador:colaboradores!turma_professores_colaborador_id_fkey (
          id,
          pessoa:pessoas!colaboradores_pessoa_id_fkey (
            id,
            nome
          )
        ),
        funcao:funcoes_colaborador!turma_professores_funcao_id_fkey (
          id,
          nome,
          codigo
        )
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

  return (
    (data as any[] | null)?.map((row) => ({
      id: row.id,
      turma_id: row.turma_id,
      colaborador_id: row.colaborador_id,
      funcao_id: row.funcao_id,
      principal: row.principal ?? false,
      data_inicio: row.data_inicio ?? null,
      data_fim: row.data_fim ?? null,
      ativo: row.ativo ?? false,
      observacoes: row.observacoes ?? null,
      nome_pessoa: row.colaborador?.pessoa?.nome ?? null,
      funcao_nome: row.funcao?.nome ?? null,
    })) ?? []
  );
}

export type VincularProfessorInput = {
  turma_id: number;
  colaborador_id: number;
  funcao_id: number;
  principal?: boolean;
  data_inicio?: string | null;
  observacoes?: string | null;
};

export async function vincularProfessorNaTurma(input: VincularProfessorInput) {
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from("turma_professores").insert({
    turma_id: input.turma_id,
    colaborador_id: input.colaborador_id,
    funcao_id: input.funcao_id,
    principal: input.principal ?? false,
    data_inicio: input.data_inicio ?? null,
    observacoes: input.observacoes ?? null,
  });

  if (error) {
    console.error("[vincularProfessorNaTurma] Erro ao inserir:", error);
    throw new Error(error.message);
  }

  if (input.principal) {
    const { error: updateError } = await supabase
      .from("turmas")
      .update({ professor_id: input.colaborador_id })
      .eq("turma_id", input.turma_id);

    if (updateError) {
      console.error("[vincularProfessorNaTurma] Falha ao atualizar professor_id na turma:", updateError);
    }
  }
}
