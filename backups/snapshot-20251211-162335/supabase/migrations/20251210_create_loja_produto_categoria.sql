------------------------------------------------------------
-- Objetivo:
-- 1) Criar a tabela public.loja_produto_categoria (categorias de produto).
-- 2) Garantir que public.loja_produto_categoria_subcategoria tenha
--    a coluna categoria_id e FK para a tabela de categoria.
-- 3) Preparar a base para a API /api/loja/produtos/categorias.
------------------------------------------------------------

DO $$
BEGIN
  --------------------------------------------------------
  -- 1) Criar tabela de categorias, se ainda nao existir
  --------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'loja_produto_categoria'
  ) THEN

    CREATE TABLE public.loja_produto_categoria (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nome text NOT NULL,
      codigo text UNIQUE,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );

  END IF;

  --------------------------------------------------------
  -- 2) Garantir coluna categoria_id em subcategorias
  --------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'loja_produto_categoria_subcategoria'
  ) THEN

    -- 2.1 Adicionar coluna categoria_id, se nao existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'loja_produto_categoria_subcategoria'
        AND column_name  = 'categoria_id'
    ) THEN
      ALTER TABLE public.loja_produto_categoria_subcategoria
        ADD COLUMN categoria_id bigint;
    END IF;

    -- 2.2 Criar FK para loja_produto_categoria, se ainda nao existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'loja_subcategoria_categoria_id_fkey'
    ) THEN
      ALTER TABLE public.loja_produto_categoria_subcategoria
        ADD CONSTRAINT loja_subcategoria_categoria_id_fkey
        FOREIGN KEY (categoria_id)
        REFERENCES public.loja_produto_categoria(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;
    END IF;

    -- 2.3 (Opcional) Indice para facilitar buscas por categoria
    CREATE INDEX IF NOT EXISTS idx_loja_subcategoria_categoria_id
      ON public.loja_produto_categoria_subcategoria (categoria_id);

  END IF;

END$$;

------------------------------------------------------------
-- FIM DA MIGRATION
------------------------------------------------------------
