import { getSupabaseServer } from "@/lib/supabaseServer";
import type {
  CurriculoExperienciaArtistica,
  CurriculoFormacaoExterna,
  CurriculoFormacaoInterna,
  CurriculoPessoa,
} from "@/types/curriculo";
import type { ResultadoAvaliacaoAluno } from "@/types/avaliacoes";

export async function buscarDadosBasicosPessoa(
  pessoaId: number
): Promise<CurriculoPessoa | null> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("pessoas")
    .select(
      [
        "id",
        "nome",
        "nome_social",
        "nascimento",
        "tipo_pessoa",
        "cpf",
        "email",
        "telefone",
        "telefone_secundario",
        "foto_url",
      ].join(",")
    )
    .eq("id", pessoaId)
    .single();

  if (error) {
    console.error("Erro ao buscar dados da pessoa:", error);
    return null;
  }

  return data as CurriculoPessoa;
}

export async function listarFormacoesInternas(
  pessoaId: number
): Promise<CurriculoFormacaoInterna[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("historico_academico")
    .select("*")
    .eq("pessoa_id", pessoaId)
    .order("data_conclusao", { ascending: false });

  if (error) {
    console.error("Erro ao listar formações internas:", error);
    // TODO: criar tabela historico_academico conforme especificação caso ainda não exista.
    return [];
  }

  return (data ?? []) as CurriculoFormacaoInterna[];
}

export async function listarFormacoesExternas(
  pessoaId: number
): Promise<CurriculoFormacaoExterna[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("curriculo_formacoes_externas")
    .select("*")
    .eq("pessoa_id", pessoaId)
    .order("data_inicio", { ascending: false });

  if (error) {
    console.error("Erro ao listar formações externas:", error);
    // TODO: criar tabela curriculo_formacoes_externas conforme especificação caso ainda não exista.
    return [];
  }

  return (data ?? []) as CurriculoFormacaoExterna[];
}

export async function listarExperienciasArtisticas(
  pessoaId: number
): Promise<CurriculoExperienciaArtistica[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("curriculo_experiencias")
    .select("*")
    .eq("pessoa_id", pessoaId)
    .order("data_evento", { ascending: false });

  if (error) {
    console.error("Erro ao listar experiências artísticas:", error);
    // TODO: criar tabela curriculo_experiencias conforme especificação caso ainda não exista.
    return [];
  }

  return (data ?? []) as CurriculoExperienciaArtistica[];
}

export async function listarAvaliacoesDoAluno(
  pessoaId: number
): Promise<ResultadoAvaliacaoAluno[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("avaliacao_aluno_resultado")
    .select(
      `
        *,
        turma_avaliacoes:turma_avaliacoes (
          id,
          turma_id,
          titulo,
          data_realizada,
          status,
          turmas:turmas (
            turma_id,
            nome,
            curso,
            nivel,
            ano_referencia
          ),
          avaliacoes_modelo:avaliacoes_modelo (
            id,
            nome,
            tipo_avaliacao
          )
        ),
        conceito:avaliacoes_conceitos (
          id,
          rotulo,
          cor_hex
        )
      `
    )
    .eq("pessoa_id", pessoaId);

  if (error) {
    console.error("Erro ao listar avaliações do aluno:", error);
    return [];
  }

  return (data ?? []) as ResultadoAvaliacaoAluno[];
}
