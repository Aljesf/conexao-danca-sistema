export interface CurriculoPessoa {
  id: number;
  nome: string | null;
  nome_social?: string | null;
  nascimento?: string | null;
  tipo_pessoa?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_secundario?: string | null;
  foto_url?: string | null;
  funcao_principal?: string | null;
}

export interface CurriculoFormacaoInterna {
  id: number;
  pessoa_id: number;
  turma_id: number | null;
  curso: string | null;
  nivel: string | null;
  tipo_turma: string | null;
  carga_horaria: number | null;
  frequencia_percentual: number | null;
  status_conclusao: string | null;
  data_conclusao: string | null;
  avaliacoes_concluidas?: string | null;
  observacoes?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface CurriculoFormacaoExterna {
  id: number;
  pessoa_id: number;
  tipo_formacao: string | null;
  instituicao: string | null;
  nome_formacao: string | null;
  carga_horaria: number | null;
  cidade_pais: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  certificado_existe: boolean | null;
  certificado_arquivo?: string | null;
  observacoes?: string | null;
}

export interface CurriculoExperienciaArtistica {
  id: number;
  pessoa_id: number;
  tipo: string | null;
  nome_evento: string | null;
  papel: string | null;
  descricao: string | null;
  data_evento: string | null;
  local: string | null;
  arquivo_midia_id?: string | null;
}
