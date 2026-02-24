-- Adiciona coluna de subcategoria em loja_produtos, vinculando a tabela
-- loja_produto_categoria_subcategoria, que ja contem centro de custo e
-- categorias financeiras (receita e despesa).

ALTER TABLE public.loja_produtos
ADD COLUMN IF NOT EXISTS categoria_subcategoria_id bigint;
-- FK para a tabela de subcategorias oficiais da Loja.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname IN (
      'loja_produtos_categoria_subcategoria_fk',
      'loja_produtos_categoria_subcategoria_id_fkey'
    )
  ) THEN
    ALTER TABLE public.loja_produtos
      ADD CONSTRAINT loja_produtos_categoria_subcategoria_fk
      FOREIGN KEY (categoria_subcategoria_id)
      REFERENCES public.loja_produto_categoria_subcategoria(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;
-- Indice para facilitar relatorios e joins.
CREATE INDEX IF NOT EXISTS idx_loja_produtos_categoria_subcategoria
  ON public.loja_produtos (categoria_subcategoria_id);
COMMENT ON COLUMN public.loja_produtos.categoria_subcategoria_id IS
  'Subcategoria oficial da loja (loja_produto_categoria_subcategoria.id). Usada para centro de custo e categorias financeiras.';
