------------------------------------------------------------
-- PASSO 1 (ajustado)
-- Criar vínculos financeiros em:
--   - public.loja_produto_categoria
--   - public.loja_produto_categoria_subcategoria
--
-- Objetivo: permitir que cada categoria/subcategoria de produto
-- traga:
--   - centro_custo_id
--   - receita_categoria_id
--   - despesa_categoria_id
------------------------------------------------------------

DO $$
BEGIN
  ----------------------------------------------------------------
  -- 1) Tabela principal de categorias: loja_produto_categoria
  ----------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'loja_produto_categoria'
  ) THEN

    -- 1.1) Colunas financeiras
    ALTER TABLE public.loja_produto_categoria
      ADD COLUMN IF NOT EXISTS centro_custo_id bigint NULL,
      ADD COLUMN IF NOT EXISTS receita_categoria_id bigint NULL,
      ADD COLUMN IF NOT EXISTS despesa_categoria_id bigint NULL;

    -- 1.2) FK para centros_custo (se existir)
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'centros_custo'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_centro_custo_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria
          ADD CONSTRAINT loja_produto_categoria_centro_custo_id_fkey
          FOREIGN KEY (centro_custo_id)
          REFERENCES public.centros_custo(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

    -- 1.3) FK para categorias de RECEITA (se tabela existir)
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'financeiro_categorias_receita'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_receita_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria
          ADD CONSTRAINT loja_produto_categoria_receita_categoria_id_fkey
          FOREIGN KEY (receita_categoria_id)
          REFERENCES public.financeiro_categorias_receita(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

    -- 1.4) FK para categorias de DESPESA (se tabela existir)
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'financeiro_categorias_despesa'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_despesa_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria
          ADD CONSTRAINT loja_produto_categoria_despesa_categoria_id_fkey
          FOREIGN KEY (despesa_categoria_id)
          REFERENCES public.financeiro_categorias_despesa(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

  END IF; -- fim IF loja_produto_categoria existe

  ----------------------------------------------------------------
  -- 2) Subcategorias: loja_produto_categoria_subcategoria
  ----------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'loja_produto_categoria_subcategoria'
  ) THEN

    -- 2.1) Colunas financeiras
    ALTER TABLE public.loja_produto_categoria_subcategoria
      ADD COLUMN IF NOT EXISTS centro_custo_id bigint NULL,
      ADD COLUMN IF NOT EXISTS receita_categoria_id bigint NULL,
      ADD COLUMN IF NOT EXISTS despesa_categoria_id bigint NULL;

    -- 2.2) FK para centros_custo
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'centros_custo'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_subcategoria_centro_custo_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_produto_categoria_subcategoria_centro_custo_id_fkey
          FOREIGN KEY (centro_custo_id)
          REFERENCES public.centros_custo(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

    -- 2.3) FK para categorias de RECEITA
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'financeiro_categorias_receita'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_subcategoria_receita_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_produto_categoria_subcategoria_receita_categoria_id_fkey
          FOREIGN KEY (receita_categoria_id)
          REFERENCES public.financeiro_categorias_receita(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

    -- 2.4) FK para categorias de DESPESA
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'financeiro_categorias_despesa'
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'loja_produto_categoria_subcategoria_despesa_categoria_id_fkey'
      ) THEN
        ALTER TABLE public.loja_produto_categoria_subcategoria
          ADD CONSTRAINT loja_produto_categoria_subcategoria_despesa_categoria_id_fkey
          FOREIGN KEY (despesa_categoria_id)
          REFERENCES public.financeiro_categorias_despesa(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL;
      END IF;
    END IF;

  END IF; -- fim IF loja_produto_categoria_subcategoria existe

END$$;

------------------------------------------------------------
-- FIM DA MIGRATION — mapeamento financeiro criado em:
--   - loja_produto_categoria
--   - loja_produto_categoria_subcategoria
------------------------------------------------------------
