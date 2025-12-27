-- Conexão Dança — Matrículas
-- Plano de Pagamento: política da primeira cobrança (NO_ATO vs ADIAR_PARA_CICLO)
-- Encoding: UTF-8 (sem BOM)

BEGIN;

ALTER TABLE public.matricula_planos_pagamento
  ADD COLUMN IF NOT EXISTS politica_primeira_cobranca text NOT NULL DEFAULT 'NO_ATO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_politica_primeira_cobranca'
  ) THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT chk_plano_politica_primeira_cobranca
      CHECK (politica_primeira_cobranca IN ('NO_ATO', 'PERMITIR_ADIAR_PARA_CICLO'));
  END IF;
END $$;

COMMIT;
