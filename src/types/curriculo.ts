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
  nome_curso: string | null;
  organizacao: string | null;
  local: string | null;
  carga_horaria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  certificado_url: string | null;
  observacoes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CurriculoExperienciaArtistica {
  id: number;
  pessoa_id: number;
  titulo: string | null;
  papel: string | null;
  organizacao: string | null;
  descricao: string | null;
  data_evento: string | null;
  comprovante_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
