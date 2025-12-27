-- Conexão Dança — Matrículas
-- Remoção definitiva da coluna legada periodicidade
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- 1) Remover constraint de periodicidade (se existir)
ALTER TABLE public.matricula_planos_pagamento
  DROP CONSTRAINT IF EXISTS matricula_planos_pagamento_periodicidade_chk;

-- 2) Remover índice de periodicidade (se existir)
DROP INDEX IF EXISTS public.idx_mpp_periodicidade;

-- 3) Remover a coluna periodicidade
ALTER TABLE public.matricula_planos_pagamento
  DROP COLUMN IF EXISTS periodicidade;

COMMIT;
