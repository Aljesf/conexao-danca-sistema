------------------------------------------------------------
-- PASSO 1 (versão correta)
-- Criar vínculos financeiros SOMENTE na tabela:
--      public.loja_produto_categoria_subcategoria
--
-- A CATEGORIA NÃO RECEBERÁ DNA FINANCEIRO.
-- Somente a SUBCATEGORIA terá:
--     - centro_custo_id
--     - receita_categoria_id
--     - despesa_categoria_id
------------------------------------------------------------

DO $$
BEGIN
  ----------------------------------------------------------------
  -- 1) Subcategorias: loja_produto_categoria_subcategoria
  ----------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'loja_produto_categoria_subcategoria'
  ) THEN

    -- 1.1) Criar colunas financeiras (se não existirem)
    ALTER TABLE public.loja_produto_categoria_subcategoria
      ADD COLUMN IF NOT EXISTS centro_custo_id bigint NULL,
      ADD COLUMN IF NOT EXISTS receita_categoria_id bigint NULL,
      ADD COLUMN IF NOT EXISTS despesa_categoria_id bigint NULL;

    ------------------------------------------------------------
    -- 1.2) FK para centros de custo
    ------------------------------------------------------------
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='centros_custo'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname='loja_subcategoria_centro_custo_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_subcategoria_centro_custo_id_fkey
          FOREIGN KEY (centro_custo_id)
          REFERENCES public.centros_custo(id)
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END IF;

    ------------------------------------------------------------
    -- 1.3) FK para categorias de RECEITA
    ------------------------------------------------------------
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name='financeiro_categorias_receita'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname='loja_subcategoria_receita_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_subcategoria_receita_categoria_id_fkey
          FOREIGN KEY (receita_categoria_id)
          REFERENCES public.financeiro_categorias_receita(id)
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END IF;

    ------------------------------------------------------------
    -- 1.4) FK para categorias de DESPESA
    ------------------------------------------------------------
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name='financeiro_categorias_despesa'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname='loja_subcategoria_despesa_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_subcategoria_despesa_categoria_id_fkey
          FOREIGN KEY (despesa_categoria_id)
          REFERENCES public.financeiro_categorias_despesa(id)
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END IF;

  END IF; -- fim IF subcategoria existe

END$$;

------------------------------------------------------------
-- FIM DA MIGRATION — DNA financeiro centralizado na SUBCATEGORIA.
------------------------------------------------------------
