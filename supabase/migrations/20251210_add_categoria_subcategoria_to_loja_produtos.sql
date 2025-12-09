ALTER TABLE public.loja_produtos
  ADD COLUMN IF NOT EXISTS categoria_subcategoria_id bigint NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name='loja_produto_categoria_subcategoria'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='loja_produtos_categoria_subcategoria_id_fkey'
    ) THEN
      ALTER TABLE public.loja_produtos
        ADD CONSTRAINT loja_produtos_categoria_subcategoria_id_fkey
        FOREIGN KEY (categoria_subcategoria_id)
        REFERENCES public.loja_produto_categoria_subcategoria(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;
END$$;
