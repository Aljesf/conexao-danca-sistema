export type ConceitoAvaliacao = {
  id: number;
  codigo: string | null;
  rotulo: string | null;
  descricao: string | null;
  ordem: number | null;
  cor_hex: string | null;
  ativo: boolean | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type TipoAvaliacao = "PRATICA" | "TEORICA" | "DESEMPENHO" | "MISTA";

export type GrupoAvaliacao = {
  nome: string;
  descricao?: string | null;
  itens: string[];
};

export type StatusAvaliacao = "RASCUNHO" | "EM_ANDAMENTO" | "CONCLUIDA";

export const STATUS_AVALIACAO_LABEL: Record<StatusAvaliacao, string> = {
  RASCUNHO: "Rascunho",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

export type ModeloAvaliacao = {
  id: number;
  nome: string | null;
  descricao: string | null;
  tipo_avaliacao: TipoAvaliacao | null;
  obrigatoria: boolean | null;
  grupos: GrupoAvaliacao[] | null;
  conceitos_ids: number[] | null;
  ativo: boolean | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type TurmaAvaliacao = {
  id: number;
  turma_id: number;
  avaliacao_modelo_id: number;
  titulo: string | null;
  descricao: string | null;
  obrigatoria: boolean | null;
  data_prevista: string | null;
  data_realizada: string | null;
  status: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type ResultadoAvaliacaoAluno = {
  id: number;
  turma_avaliacao_id: number;
  pessoa_id: number;
  conceito_final_id: number | null;
  conceitos_por_grupo: Record<string, number> | null;
  observacoes_professor: string | null;
  data_avaliacao: string | null;
  avaliador_id: number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type ConceitoBasico = {
  id: number;
  rotulo: string | null;
  cor_hex: string | null;
};
