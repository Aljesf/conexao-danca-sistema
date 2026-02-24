-- ===========================================
-- Migration — Loja v0
-- Adiciona fornecedor principal e datas em loja_produtos
-- ===========================================

-- Adiciona fornecedor principal ao produto
ALTER TABLE public.loja_produtos
ADD COLUMN IF NOT EXISTS fornecedor_principal_id BIGINT
REFERENCES public.loja_fornecedores(id);
-- Datas de cadastro e atualização (se ainda não existirem)
ALTER TABLE public.loja_produtos
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- Função genérica para updated_at, caso não exista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_current_timestamp_updated_at'
  ) THEN
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
-- Trigger para atualizar updated_at em loja_produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_timestamp_loja_produtos'
  ) THEN
    CREATE TRIGGER set_timestamp_loja_produtos
    BEFORE UPDATE ON public.loja_produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;
