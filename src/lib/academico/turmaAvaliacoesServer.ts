"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type TurmaAvaliacao = {
  id: number;
  turma_id: number;
  avaliacao_modelo_id: number;
  obrigatoria: boolean;
  data_prevista: string | null;
  data_realizada: string | null;
  modelo?: {
    id: number;
    nome: string;
    tipo_avaliacao?: string | null;
    obrigatoria?: boolean;
  };
};

export async function listarAvaliacoesDaTurma(
  turmaId: number,
): Promise<TurmaAvaliacao[]> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .select(
      `
        id,
        turma_id,
        avaliacao_modelo_id,
        obrigatoria,
        data_prevista,
        data_realizada,
        avaliacoes_modelo (
          id,
          nome,
          tipo_avaliacao,
          obrigatoria
        )
      `,
    )
    .eq("turma_id", turmaId)
    .order("data_prevista", { ascending: true });

  if (error) {
    console.error("[listarAvaliacoesDaTurma] Erro:", error);
    throw new Error(error.message);
  }

  return (
    data?.map((row: any) => ({
      id: row.id,
      turma_id: row.turma_id,
      avaliacao_modelo_id: row.avaliacao_modelo_id,
      obrigatoria: row.obrigatoria,
      data_prevista: row.data_prevista,
      data_realizada: row.data_realizada,
      modelo: row.avaliacoes_modelo
        ? {
            id: row.avaliacoes_modelo.id,
            nome: row.avaliacoes_modelo.nome,
            tipo_avaliacao: row.avaliacoes_modelo.tipo_avaliacao ?? null,
            obrigatoria: row.avaliacoes_modelo.obrigatoria ?? null,
          }
        : undefined,
    })) ?? []
  );
}

export type CriarTurmaAvaliacaoInput = {
  turma_id: number;
  avaliacao_modelo_id: number;
  obrigatoria?: boolean;
  data_prevista?: string | null;
};

export async function criarTurmaAvaliacao(input: CriarTurmaAvaliacaoInput) {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .insert({
      turma_id: input.turma_id,
      avaliacao_modelo_id: input.avaliacao_modelo_id,
      obrigatoria: input.obrigatoria ?? true,
      data_prevista: input.data_prevista ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[criarTurmaAvaliacao] Erro:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function removerTurmaAvaliacao(id: number) {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("turma_avaliacoes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[removerTurmaAvaliacao] Erro:", error);
    throw new Error(error.message);
  }
}
