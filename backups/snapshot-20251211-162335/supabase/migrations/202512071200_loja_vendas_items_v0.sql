-- ===========================================
-- Migration: Loja v0 - vendas e itens
-- Garante a existencia das tabelas:
--   - public.loja_vendas
--   - public.loja_venda_itens
-- Adiciona coluna cobranca_id para futura integracao financeira.
-- ===========================================

-- Tabela de cabecalho de vendas/entregas
CREATE TABLE IF NOT EXISTS public.loja_vendas (
  id bigserial PRIMARY KEY,
  cliente_pessoa_id bigint NOT NULL REFERENCES public.pessoas(id),
  tipo_venda text NOT NULL,
  valor_total_centavos integer NOT NULL,
  desconto_centavos integer NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL,
  status_pagamento text NOT NULL,
  status_venda text NOT NULL DEFAULT 'ATIVA',
  data_venda timestamptz NOT NULL DEFAULT now(),
  data_vencimento date,
  observacoes text,
  observacao_vendedor text,
  vendedor_user_id uuid REFERENCES public.profiles(user_id),
  cancelada_em timestamptz,
  cancelada_por_user_id uuid REFERENCES public.profiles(user_id),
  motivo_cancelamento text,
  cobranca_id bigint REFERENCES public.cobrancas(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de itens da venda
CREATE TABLE IF NOT EXISTS public.loja_venda_itens (
  id bigserial PRIMARY KEY,
  venda_id bigint NOT NULL REFERENCES public.loja_vendas(id) ON DELETE CASCADE,
  produto_id bigint NOT NULL REFERENCES public.loja_produtos(id),
  quantidade integer NOT NULL,
  preco_unitario_centavos integer NOT NULL,
  total_centavos integer NOT NULL,
  beneficiario_pessoa_id bigint REFERENCES public.pessoas(id),
  observacoes text
);

-- Garantir colunas criadas quando tabela ja existia
ALTER TABLE public.loja_vendas
ADD COLUMN IF NOT EXISTS cobranca_id bigint REFERENCES public.cobrancas(id),
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.loja_venda_itens
ADD COLUMN IF NOT EXISTS observacoes text;

-- Funcao generica para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_current_timestamp_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
    RETURNS trigger AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END;
$$;

-- Trigger updated_at em loja_vendas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_loja_vendas'
  ) THEN
    CREATE TRIGGER set_timestamp_loja_vendas
    BEFORE UPDATE ON public.loja_vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

-- Indices auxiliares
CREATE INDEX IF NOT EXISTS idx_loja_vendas_cliente ON public.loja_vendas (cliente_pessoa_id);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_data ON public.loja_vendas (data_venda);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_status_pagamento ON public.loja_vendas (status_pagamento);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_status_venda ON public.loja_vendas (status_venda);
CREATE INDEX IF NOT EXISTS idx_loja_venda_itens_venda ON public.loja_venda_itens (venda_id);
CREATE INDEX IF NOT EXISTS idx_loja_venda_itens_produto ON public.loja_venda_itens (produto_id);
