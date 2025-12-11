export interface TurmaProfessor {
  id: number;
  turma_id: number;
  colaborador_id: number;
  funcao_id: number;
  principal: boolean;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  observacoes: string | null;
  colaboradores?: {
    id: number;
    pessoa_id: number;
    pessoas?: { id: number; nome: string };
  };
  funcao?: {
    id: number;
    nome: string;
  };
}
