-- Tabela auxiliar para valores manuais por execucao (UE)
CREATE TABLE IF NOT EXISTS public.matricula_execucao_valores (
  id BIGSERIAL PRIMARY KEY,
  matricula_id BIGINT NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  turma_id BIGINT NOT NULL REFERENCES public.turmas(turma_id),
  nivel TEXT NOT NULL,
  valor_mensal_centavos INTEGER NOT NULL CHECK (valor_mensal_centavos >= 0),
  origem_valor TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL | TABELA
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mev_matricula ON public.matricula_execucao_valores (matricula_id);
CREATE INDEX IF NOT EXISTS idx_mev_turma ON public.matricula_execucao_valores (turma_id);

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS origem_valor TEXT;
