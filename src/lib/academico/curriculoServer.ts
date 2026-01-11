import { createAdminClient } from "@/lib/supabase/admin";
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("historico_academico")
    .select(
      "id,pessoa_id,turma_id,titulo,nivel,ano_referencia,data_inicio,data_fim,status,observacoes,created_at,updated_at"
    )
    .eq("pessoa_id", pessoaId)
    .order("data_fim", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function listarFormacoesExternas(
  pessoaId: number
): Promise<CurriculoFormacaoExterna[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("curriculo_formacoes_externas")
    .select(
      "id,pessoa_id,nome_curso,organizacao,local,carga_horaria,data_inicio,data_fim,certificado_url,observacoes,created_at,updated_at"
    )
    .eq("pessoa_id", pessoaId)
    .order("data_fim", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function listarExperienciasArtisticas(
  pessoaId: number
): Promise<CurriculoExperienciaArtistica[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("curriculo_experiencias_artisticas")
    .select(
      "id,pessoa_id,titulo,papel,organizacao,data_evento,descricao,comprovante_url,created_at,updated_at"
    )
    .eq("pessoa_id", pessoaId)
    .order("data_evento", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data ?? [];
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
    console.error("Erro ao listar avaliaÃ§Ãµes do aluno:", error);
    return [];
  }

  return (data ?? []) as ResultadoAvaliacaoAluno[];
}

