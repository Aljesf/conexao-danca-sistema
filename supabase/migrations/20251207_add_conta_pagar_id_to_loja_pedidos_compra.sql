------------------------------------------------------------
-- Migration: adicionar coluna conta_pagar_id em loja_pedidos_compra
-- Objetivo: permitir vincular pedidos de compra a contas_pagar
-- e corrigir o erro "column loja_pedidos_compra.conta_pagar_id does not exist"
------------------------------------------------------------

-- 1) Adicionar a coluna (se ainda não existir)
ALTER TABLE public.loja_pedidos_compra
  ADD COLUMN IF NOT EXISTS conta_pagar_id bigint;

-- 2) Garantir que não exista uma FK antiga com mesmo nome
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loja_pedidos_compra_conta_pagar_id_fkey'
  ) THEN
    ALTER TABLE public.loja_pedidos_compra
      DROP CONSTRAINT loja_pedidos_compra_conta_pagar_id_fkey;
  END IF;
END$$;

-- 3) Criar a foreign key para contas_pagar
ALTER TABLE public.loja_pedidos_compra
  ADD CONSTRAINT loja_pedidos_compra_conta_pagar_id_fkey
  FOREIGN KEY (conta_pagar_id)
  REFERENCES public.contas_pagar(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- (Opcional futuro)
-- Poderíamos criar um índice para facilitar buscas por conta_pagar_id:
-- CREATE INDEX IF NOT EXISTS idx_loja_pedidos_compra_conta_pagar_id
--   ON public.loja_pedidos_compra (conta_pagar_id);

------------------------------------------------------------
-- Fim da migration
------------------------------------------------------------
