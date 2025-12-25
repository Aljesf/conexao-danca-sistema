BEGIN;

ALTER TABLE public.matriculas
ADD COLUMN IF NOT EXISTS plano_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_matriculas_plano_id
  ON public.matriculas (plano_id);

COMMIT;
