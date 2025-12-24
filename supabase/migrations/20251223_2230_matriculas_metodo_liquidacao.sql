-- =====================================================================================
-- Matriculas: metodo de liquidacao (v1)
-- Data: 2025-12-23
-- Objetivo:
-- - matricula unica
-- - eixo financeiro selecionavel via metodo_liquidacao
--   * CARTAO_CONEXAO (default v1)
--   * COBRANCAS_LEGADO (fallback temporario)
--   * CREDITO_BOLSA (fase 2)
-- =====================================================================================

BEGIN;

ALTER TABLE public.matriculas
ADD COLUMN IF NOT EXISTS metodo_liquidacao TEXT NOT NULL DEFAULT 'CARTAO_CONEXAO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_metodo_liquidacao_chk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_metodo_liquidacao_chk
      CHECK (metodo_liquidacao IN ('CARTAO_CONEXAO','COBRANCAS_LEGADO','CREDITO_BOLSA'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matriculas_metodo_liquidacao
  ON public.matriculas (metodo_liquidacao);

COMMIT;
