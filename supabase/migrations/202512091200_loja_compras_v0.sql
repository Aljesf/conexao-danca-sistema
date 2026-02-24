-- ===========================================
-- Migration: Loja v0 - Compras (pedidos e recebimentos)
-- Cria tabelas de pedidos de compra, itens e recebimentos.
-- ===========================================

-- Cabeçalho do pedido de compra
CREATE TABLE IF NOT EXISTS public.loja_pedidos_compra (
  id bigserial PRIMARY KEY,
  fornecedor_id bigint NOT NULL REFERENCES public.loja_fornecedores(id),
  data_pedido timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'RASCUNHO', -- RASCUNHO, EM_ANDAMENTO, PARCIAL, CONCLUIDO, CANCELADO
  valor_estimado_centavos integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(user_id),
  updated_by uuid REFERENCES public.profiles(user_id)
);
-- Itens do pedido
CREATE TABLE IF NOT EXISTS public.loja_pedidos_compra_itens (
  id bigserial PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.loja_pedidos_compra(id) ON DELETE CASCADE,
  produto_id bigint NOT NULL REFERENCES public.loja_produtos(id),
  quantidade_solicitada integer NOT NULL,
  quantidade_recebida integer NOT NULL DEFAULT 0,
  preco_custo_centavos integer NOT NULL DEFAULT 0,
  observacoes text
);
-- Recebimentos (podem ser parciais)
CREATE TABLE IF NOT EXISTS public.loja_pedidos_compra_recebimentos (
  id bigserial PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.loja_pedidos_compra(id) ON DELETE CASCADE,
  item_id bigint NOT NULL REFERENCES public.loja_pedidos_compra_itens(id) ON DELETE CASCADE,
  produto_id bigint NOT NULL REFERENCES public.loja_produtos(id),
  quantidade_recebida integer NOT NULL,
  preco_custo_centavos integer NOT NULL,
  data_recebimento timestamptz NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(user_id)
);
-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_fornecedor
  ON public.loja_pedidos_compra (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_status
  ON public.loja_pedidos_compra (status);
CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_itens_pedido
  ON public.loja_pedidos_compra_itens (pedido_id);
CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_recebimentos_pedido
  ON public.loja_pedidos_compra_recebimentos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_recebimentos_produto
  ON public.loja_pedidos_compra_recebimentos (produto_id);
