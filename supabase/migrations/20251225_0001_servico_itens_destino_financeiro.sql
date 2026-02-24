BEGIN;
-- Centro de custo destino (para distribuir apos liquidacao da fatura)
ALTER TABLE public.servico_itens
ADD COLUMN IF NOT EXISTS destino_centro_custo_id integer;
-- Categoria financeira destino (opcional; util para relatorios/contabilizacao)
ALTER TABLE public.servico_itens
ADD COLUMN IF NOT EXISTS destino_categoria_financeira_id integer;
-- Indices (opcional, baratos)
CREATE INDEX IF NOT EXISTS idx_servico_itens_destino_cc
  ON public.servico_itens (destino_centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_servico_itens_destino_cat
  ON public.servico_itens (destino_categoria_financeira_id);
COMMIT;
