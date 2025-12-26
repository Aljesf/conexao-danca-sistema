BEGIN;

-- 1) Campos faltantes no banco atual (ver schema-atual-2025-12-26.md)
ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS data_inicio_vinculo DATE;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS tabela_matricula_id BIGINT REFERENCES public.matricula_tabelas(id) ON DELETE SET NULL;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS plano_pagamento_id BIGINT;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS vencimento_padrao_referencia INTEGER;

-- 2) Backfill conservador
UPDATE public.matriculas
SET data_inicio_vinculo = data_matricula
WHERE data_inicio_vinculo IS NULL;

UPDATE public.matriculas
SET vencimento_padrao_referencia = 12
WHERE vencimento_padrao_referencia IS NULL;

-- 3) Constraints leves (evitar dados invalidos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_vencimento_ref_chk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_vencimento_ref_chk
      CHECK (
        vencimento_padrao_referencia IS NULL
        OR (vencimento_padrao_referencia BETWEEN 1 AND 28)
      );
  END IF;
END $$;

COMMIT;
