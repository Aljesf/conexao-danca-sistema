-- Reverter estrutura adicionada para status_fluxo/rascunho

-- 1) Remover constraint se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matriculas_status_fluxo_check'
  ) THEN
    ALTER TABLE public.matriculas DROP CONSTRAINT matriculas_status_fluxo_check;
  END IF;
END$$;

-- 2) Remover indices se existirem
DROP INDEX IF EXISTS public.idx_matriculas_status_fluxo;
DROP INDEX IF EXISTS public.idx_matriculas_concluida_em;

-- 3) Remover colunas adicionadas (se existirem)
ALTER TABLE public.matriculas
  DROP COLUMN IF EXISTS status_fluxo,
  DROP COLUMN IF EXISTS concluida_em,
  DROP COLUMN IF EXISTS cancelada_em,
  DROP COLUMN IF EXISTS motivo_cancelamento;
