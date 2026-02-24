-- [INICIO DO BLOCO] supabase/migrations/<timestamp>_turma_encontros_datas_especificas.sql

CREATE TABLE IF NOT EXISTS public.turma_encontros (
  id bigserial PRIMARY KEY,
  turma_id bigint NOT NULL REFERENCES public.turmas(turma_id) ON DELETE CASCADE,
  data date NOT NULL,
  hora_inicio time NULL,
  hora_fim time NULL,
  ordem integer NOT NULL DEFAULT 0,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_turma_encontros_turma ON public.turma_encontros(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_encontros_data ON public.turma_encontros(data);
-- [FIM DO BLOCO];
