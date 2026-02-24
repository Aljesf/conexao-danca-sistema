-- ===========================================
-- Migration: Loja v0 - movimentos de estoque
-- Cria tabela de movimentos e indices auxiliares.
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_estoque_movimentos (
  id bigserial PRIMARY KEY,
  produto_id bigint NOT NULL REFERENCES public.loja_produtos(id),
  tipo text NOT NULL, -- ENTRADA, SAIDA, AJUSTE
  quantidade integer NOT NULL,
  origem text NOT NULL, -- VENDA, CANCELAMENTO_VENDA, AJUSTE_MANUAL
  referencia_id bigint,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(user_id)
);
CREATE INDEX IF NOT EXISTS idx_loja_estoque_movimentos_produto
  ON public.loja_estoque_movimentos (produto_id);
CREATE INDEX IF NOT EXISTS idx_loja_estoque_movimentos_created_at
  ON public.loja_estoque_movimentos (created_at);
