-- Movimento - Creditos (deficit institucional)
-- 2026-01-07

BEGIN;

-- 1) Vincular (opcionalmente) um credito concedido a um lote de estoque.
ALTER TABLE IF EXISTS public.movimento_creditos
  ADD COLUMN IF NOT EXISTS lote_id uuid NULL REFERENCES public.movimento_creditos_lotes(id) ON DELETE SET NULL;

-- 2) View de leitura institucional: deficit (concedido sem lastro em lote)
CREATE OR REPLACE VIEW public.vw_movimento_deficit_institucional AS
SELECT
  mc.tipo AS tipo_credito,
  mc.origem AS origem_credito,
  COUNT(*) FILTER (WHERE mc.lote_id IS NULL) AS creditos_sem_lote,
  SUM(mc.quantidade_total) FILTER (WHERE mc.lote_id IS NULL) AS quantidade_sem_lote
FROM public.movimento_creditos mc
GROUP BY mc.tipo, mc.origem;

COMMIT;
