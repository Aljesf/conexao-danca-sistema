BEGIN;

-- 1) Destino por item (para distribuir principal apos pagamento da fatura)
ALTER TABLE public.servico_itens
ADD COLUMN IF NOT EXISTS destino_centro_custo_id integer;

ALTER TABLE public.servico_itens
ADD COLUMN IF NOT EXISTS destino_categoria_financeira_id integer;

-- 2) Centro de custo da intermediacao por conta do Cartao Conexao
-- (onde ficam taxas/juros/multa do proprio Cartao Conexao)
ALTER TABLE public.credito_conexao_contas
ADD COLUMN IF NOT EXISTS centro_custo_intermediacao_id integer;

ALTER TABLE public.credito_conexao_contas
ADD COLUMN IF NOT EXISTS categoria_taxas_id integer;

-- indices
CREATE INDEX IF NOT EXISTS idx_credito_conexao_contas_cc_inter
  ON public.credito_conexao_contas (centro_custo_intermediacao_id);

CREATE INDEX IF NOT EXISTS idx_servico_itens_destino_cc
  ON public.servico_itens (destino_centro_custo_id);

COMMIT;
