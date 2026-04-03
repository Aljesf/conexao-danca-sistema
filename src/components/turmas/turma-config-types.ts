export type TurmaResumoEditable = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  ano_referencia: number | null;
  tipo_turma: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  frequencia_minima_percentual: number | null;
  carga_horaria_prevista: number | null;
  capacidade: number | null;
  periodo_letivo_id: number | null;
  encerramento_automatico: boolean | null;
  observacoes: string | null;
  professor_principal: string | null;
  grade_horario: string;
  dias_semana: string[];
  hora_inicio: string | null;
  hora_fim: string | null;
  total_alunos: number;
  espaco_nome: string | null;
  local_nome: string | null;
};

export type TurmaHorarioDetalhado = {
  id: number;
  dia_semana: number;
  dia_label: string;
  hora_inicio: string;
  hora_fim: string;
};

export type TurmaProfessorVinculo = {
  id: number;
  turma_id: number;
  colaborador_id: number;
  colaborador_nome: string;
  pessoa_id: number | null;
  funcao_id: number;
  funcao_nome: string;
  funcao_codigo: string | null;
  funcao_grupo: string | null;
  principal: boolean;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
};

export type TurmaProfessorOption = {
  colaborador_id: number;
  nome: string;
};

export type TurmaFuncaoOption = {
  id: number;
  nome: string;
  codigo: string;
  grupo: string;
  grupo_nome: string | null;
};
