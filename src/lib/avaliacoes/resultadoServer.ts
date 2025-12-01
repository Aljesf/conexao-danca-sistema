import { getSupabaseServer } from "@/lib/supabaseServer";
import type {
  ConceitoBasico,
  ModeloAvaliacao,
  ResultadoAvaliacaoAluno,
} from "@/types/avaliacoes";

export async function listarResultadosPorAvaliacao(avaliacaoId: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacao_aluno_resultado")
    .select("*")
    .eq("turma_avaliacao_id", avaliacaoId);

  if (error) {
    console.error("Erro ao listar resultados da avaliação:", error);
    return [];
  }

  return (data ?? []) as ResultadoAvaliacaoAluno[];
}

export async function salvarResultadosEmLote(
  payload: ResultadoAvaliacaoAluno[]
) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("avaliacao_aluno_resultado")
    .upsert(payload, { onConflict: "turma_avaliacao_id,pessoa_id" });

  if (error) throw error;
}

type LancamentoAluno = {
  pessoaId: number;
  conceitoFinalId: number | null;
  conceitosPorGrupo: Record<string, number | null>;
  observacoes?: string | null;
};

export async function salvarResultadosLancamento(
  avaliacaoId: number,
  dataAvaliacao: string,
  alunos: LancamentoAluno[]
) {
  const supabase = await getSupabaseServer();

  // trava caso avaliação esteja concluída
  const { data: avaliacaoStatus, error: statusError } = await supabase
    .from("turma_avaliacoes")
    .select("status")
    .eq("id", avaliacaoId)
    .single();

  if (statusError) {
    console.error("Erro ao verificar status da avaliação:", statusError);
    throw statusError;
  }

  if (avaliacaoStatus?.status === "CONCLUIDA") {
    throw new Error("Não é possível alterar notas de uma avaliação concluída.");
  }

  const payload = alunos.map((a) => ({
    turma_avaliacao_id: avaliacaoId,
    pessoa_id: a.pessoaId,
    conceito_final_id: a.conceitoFinalId,
    conceitos_por_grupo: a.conceitosPorGrupo,
    observacoes_professor: a.observacoes ?? null,
    data_avaliacao: dataAvaliacao,
    avaliador_id: null, // TODO: capturar colaborador logado
  }));

  const { error } = await supabase
    .from("avaliacao_aluno_resultado")
    .upsert(payload, { onConflict: "turma_avaliacao_id,pessoa_id" });

  if (error) throw error;
}

export type ContextoLancamento = {
  avaliacao: any;
  turma: any;
  modelo: ModeloAvaliacao | null;
  conceitos: ConceitoBasico[];
  alunos: { pessoa_id: number; nome: string; foto_url: string | null }[];
  resultados: ResultadoAvaliacaoAluno[];
};

export async function carregarContextoLancamento(
  avaliacaoId: number
): Promise<ContextoLancamento | null> {
  const supabase = await getSupabaseServer();

  const { data: avaliacao, error: aError } = await supabase
    .from("turma_avaliacoes")
    .select("*")
    .eq("id", avaliacaoId)
    .single();
  if (aError || !avaliacao) {
    console.error("Erro ao carregar avaliação:", aError);
    return null;
  }

  const { data: turma, error: tError } = await supabase
    .from("turmas")
    .select("turma_id, nome, curso, nivel, ano_referencia, turno")
    .eq("turma_id", avaliacao.turma_id)
    .single();
  if (tError) {
    console.error("Erro ao carregar turma da avaliação:", tError);
  }

  const { data: modelo, error: mError } = await supabase
    .from("avaliacoes_modelo")
    .select("*")
    .eq("id", avaliacao.avaliacao_modelo_id)
    .single();
  if (mError) {
    console.error("Erro ao carregar modelo da avaliação:", mError);
  }

  let conceitos: ConceitoBasico[] = [];
  if (modelo?.conceitos_ids && (modelo.conceitos_ids as any).length > 0) {
    const { data: consData, error: cError } = await supabase
      .from("avaliacoes_conceitos")
      .select("id, rotulo, cor_hex, ordem")
      .in("id", modelo.conceitos_ids as number[])
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("rotulo", { ascending: true });
    if (cError) {
      console.error("Erro ao carregar conceitos da avaliação:", cError);
    } else {
      conceitos = (consData ?? []) as ConceitoBasico[];
    }
  }

  // alunos da turma (mesma fonte usada para lista de alunos da turma; assumindo tabela turma_aluno)
  const { data: alunosData, error: alunosError } = await supabase
    .from("turma_aluno")
    .select(
      `
        pessoa_id,
        pessoas (
          id,
          nome,
          foto_url
        )
      `
    )
    .eq("turma_id", avaliacao.turma_id);

  if (alunosError) {
    console.error("Erro ao carregar alunos da turma:", alunosError);
  }

  const alunos =
    alunosData?.map((a: any) => ({
      pessoa_id: a.pessoa_id,
      nome: a.pessoas?.nome ?? "Aluno",
      foto_url: a.pessoas?.foto_url ?? null,
    })) ?? [];

  const resultados = await listarResultadosPorAvaliacao(avaliacaoId);

  return {
    avaliacao,
    turma,
    modelo: modelo as any,
    conceitos,
    alunos,
    resultados,
  };
}
