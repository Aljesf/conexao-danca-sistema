import { getSupabaseServer } from "@/lib/supabaseServer";
import type {
  ConceitoBasico,
  StatusAvaliacao,
  TurmaAvaliacao,
} from "@/types/avaliacoes";

export async function listarAvaliacoesDaTurma(turmaId: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .select(
      `
        *,
        avaliacoes_modelo (
          id,
          nome,
          tipo_avaliacao
        )
      `
    )
    .eq("turma_id", turmaId)
    .order("data_prevista", { ascending: true });

  if (error) {
    console.error("Erro ao listar avaliações da turma:", error);
    return [];
  }

  return data as TurmaAvaliacao[];
}

export async function criarAvaliacaoParaTurma(payload: Partial<TurmaAvaliacao>) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as TurmaAvaliacao;
}

export async function atualizarAvaliacaoDaTurma(
  id: number,
  payload: Partial<TurmaAvaliacao>
) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turma_avaliacoes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TurmaAvaliacao;
}

export type ResultadoAvaliacaoDetalhe = {
  pessoa_id: number;
  aluno_nome: string;
  aluno_foto_url: string | null;
  conceito_final_id: number | null;
  conceitos_por_grupo: Record<string, number | null> | null;
  observacoes_professor: string | null;
  data_avaliacao: string | null;
};

export type DetalheAvaliacaoContexto = {
  avaliacao: any;
  turma: any;
  modelo: any;
  conceitos: ConceitoBasico[];
  resultados: ResultadoAvaliacaoDetalhe[];
};

export async function iniciarAvaliacao(id: number) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("turma_avaliacoes")
    .update({ status: "EM_ANDAMENTO" satisfies StatusAvaliacao })
    .eq("id", id);

  if (error) {
    console.error("Erro ao iniciar avaliação:", error);
    throw error;
  }
}

export async function concluirAvaliacao(id: number) {
  const supabase = await getSupabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("turma_avaliacoes")
    .update({
      status: "CONCLUIDA" satisfies StatusAvaliacao,
      data_realizada: today,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao concluir avaliação:", error);
    throw error;
  }
}

export async function carregarDetalheAvaliacao(turmaId: number, avaliacaoId: number) {
  const supabase = await getSupabaseServer();

  const { data: avaliacao, error: avaliacaoError } = await supabase
    .from("turma_avaliacoes")
    .select("*")
    .eq("id", avaliacaoId)
    .eq("turma_id", turmaId)
    .single();

  if (avaliacaoError || !avaliacao) {
    console.error("Erro ao carregar detalhe da avaliação:", avaliacaoError);
    return null;
  }

  const { data: turma, error: turmaError } = await supabase
    .from("turmas")
    .select("turma_id, nome, curso, nivel, ano_referencia, turno")
    .eq("turma_id", turmaId)
    .single();
  if (turmaError) {
    console.error("Erro ao carregar turma do detalhe de avaliação:", turmaError);
  }

  const { data: modelo, error: modeloError } = await supabase
    .from("avaliacoes_modelo")
    .select("*")
    .eq("id", avaliacao.avaliacao_modelo_id)
    .single();
  if (modeloError) {
    console.error("Erro ao carregar modelo do detalhe de avaliação:", modeloError);
  }

  let conceitos: ConceitoBasico[] = [];
  if (modelo?.conceitos_ids && (modelo.conceitos_ids as any).length > 0) {
    const { data: consData, error: consError } = await supabase
      .from("avaliacoes_conceitos")
      .select("id, rotulo, cor_hex, ordem")
      .in("id", modelo.conceitos_ids as number[])
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("rotulo", { ascending: true });
    if (consError) {
      console.error("Erro ao carregar conceitos do detalhe de avaliação:", consError);
    } else {
      conceitos = (consData ?? []).map((c) => ({
        id: c.id,
        rotulo: c.rotulo,
        cor_hex: c.cor_hex,
      }));
    }
  }

  const { data: resultados, error: resultadosError } = await supabase
    .from("avaliacao_aluno_resultado")
    .select(
      `
        pessoa_id,
        conceito_final_id,
        conceitos_por_grupo,
        observacoes_professor,
        data_avaliacao,
        pessoas:pessoas (
          id,
          nome,
          foto_url
        )
      `
    )
    .eq("turma_avaliacao_id", avaliacaoId);

  if (resultadosError) {
    console.error("Erro ao carregar resultados da avaliação:", resultadosError);
  }

  return {
    avaliacao,
    turma,
    modelo,
    conceitos,
    resultados: (resultados ?? []).map((r) => ({
      pessoa_id: r.pessoa_id,
      aluno_nome: r.pessoas?.nome ?? "Aluno",
      aluno_foto_url: r.pessoas?.foto_url ?? null,
      conceito_final_id: r.conceito_final_id,
      conceitos_por_grupo: r.conceitos_por_grupo ?? null,
      observacoes_professor: r.observacoes_professor ?? null,
      data_avaliacao: r.data_avaliacao ?? null,
    })) as ResultadoAvaliacaoDetalhe[],
  } as DetalheAvaliacaoContexto;
}
