"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type TurmaAvaliacao = {
  id: number;
  turma_id: number;
  avaliacao_modelo_id: number;
  titulo: string;
  descricao: string | null;
  obrigatoria: boolean;
  data_prevista: string | null;
  data_realizada: string | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
  modelo?: {
    id: number;
    nome: string;
    tipo_avaliacao: string;
    obrigatoria: boolean;
    ativo: boolean;
  };
};

export async function listarAvaliacoesDaTurma(turmaId: number): Promise<TurmaAvaliacao[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .select(
      `
        id,
        turma_id,
        avaliacao_modelo_id,
        titulo,
        descricao,
        obrigatoria,
        data_prevista,
        data_realizada,
        status,
        criado_em,
        atualizado_em,
        avaliacoes_modelo (
          id,
          nome,
          tipo_avaliacao,
          obrigatoria,
          ativo
        )
      `,
    )
    .eq("turma_id", turmaId)
    .order("data_prevista", { ascending: true });

  if (error) {
    console.error("[listarAvaliacoesDaTurma] Erro:", error, "raw:", JSON.stringify(error));
    return [];
  }

  return (
    (data as any[] | null)?.map((row) => ({
      id: row.id,
      turma_id: row.turma_id,
      avaliacao_modelo_id: row.avaliacao_modelo_id,
      titulo: row.titulo,
      descricao: row.descricao,
      obrigatoria: row.obrigatoria,
      data_prevista: row.data_prevista,
      data_realizada: row.data_realizada,
      status: row.status,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      modelo: row.avaliacoes_modelo
        ? {
            id: row.avaliacoes_modelo.id,
            nome: row.avaliacoes_modelo.nome,
            tipo_avaliacao: row.avaliacoes_modelo.tipo_avaliacao,
            obrigatoria: row.avaliacoes_modelo.obrigatoria,
            ativo: row.avaliacoes_modelo.ativo,
          }
        : undefined,
    })) ?? []
  );
}

export type CriarTurmaAvaliacaoInput = {
  turma_id: number;
  avaliacao_modelo_id: number;
  titulo: string;
  descricao?: string | null;
  obrigatoria?: boolean;
  data_prevista?: string | null;
  status?: string;
};

export async function criarTurmaAvaliacao(input: CriarTurmaAvaliacaoInput): Promise<TurmaAvaliacao> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .insert({
      turma_id: input.turma_id,
      avaliacao_modelo_id: input.avaliacao_modelo_id,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      obrigatoria: input.obrigatoria ?? false,
      data_prevista: input.data_prevista ?? null,
      status: input.status ?? "RASCUNHO",
    })
    .select(
      `
        id,
        turma_id,
        avaliacao_modelo_id,
        titulo,
        descricao,
        obrigatoria,
        data_prevista,
        data_realizada,
        status,
        criado_em,
        atualizado_em
      `,
    )
    .single();

  if (error) {
    console.error("[criarTurmaAvaliacao] Erro:", error);
    throw new Error(error.message);
  }

  return data as TurmaAvaliacao;
}

export async function removerTurmaAvaliacao(id: number): Promise<void> {
  const supabase = await getSupabaseServer();

  const { error } = await supabase.from("turma_avaliacoes").delete().eq("id", id);

  if (error) {
    console.error("[removerTurmaAvaliacao] Erro:", error);
    throw new Error(error.message);
  }
}

// Alias para seguir o naming usado nas instrucoes
export type CriarAvaliacaoTurmaInput = CriarTurmaAvaliacaoInput;

export async function criarAvaliacaoDaTurma(input: CriarAvaliacaoTurmaInput) {
  return criarTurmaAvaliacao(input);
}
