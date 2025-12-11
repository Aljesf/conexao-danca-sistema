// Tipos baseados no "Modelo de Turmas — Conexão Dança v1.1.2"

export type TipoTurma = "REGULAR" | "CURSO_LIVRE" | "ENSAIO";
export type StatusTurma = "EM_PREPARACAO" | "ATIVA" | "ENCERRADA" | "CANCELADA";
export type TurnoTurma = "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";

export interface Turma {
  turma_id?: number;
  id: number;
  nome?: string;
  nome_turma?: string; // compatibilidade antiga
  tipo_turma: TipoTurma | null;
  turno: TurnoTurma | null;
  serie: string | null;
  nivel: string | null;
  ano_referencia: number | null;
  curso: string | null;
  modalidade: string | null; // representa o curso como texto hoje
  carga_horaria_prevista: number | null;
  frequencia_minima_percentual: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  dias_semana: string | string[] | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  professor_id: number | null;
  observacoes: string | null;
  ativo?: boolean | null;
  status?: StatusTurma | null;
  created_at?: string;
  updated_at?: string;
}

export interface TurmaHorario {
  id: number;
  turma_id: number;
  day_of_week: number; // 0 (domingo) a 6 (sábado)
  inicio: string; // "HH:MM:SS"
  fim: string; // "HH:MM:SS"
}
