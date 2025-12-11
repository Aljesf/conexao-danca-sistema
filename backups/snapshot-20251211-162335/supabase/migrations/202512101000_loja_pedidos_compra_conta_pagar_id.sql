-- ===========================================
-- Migration: Loja v0 - compras x financeiro
-- Adiciona conta_pagar_id em loja_pedidos_compra
-- ===========================================

ALTER TABLE IF NOT EXISTS public.loja_pedidos_compra
ADD COLUMN IF NOT EXISTS conta_pagar_id bigint REFERENCES public.contas_pagar(id);

