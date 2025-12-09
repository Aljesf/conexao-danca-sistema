-- Migration: adiciona coluna de vinculo a subcategoria na tabela loja_produtos
-- Observacao: mantemos a coluna como NULLABLE para nao quebrar dados existentes.
-- Caso ja exista uma tabela de subcategorias da Loja, a FK pode ser ajustada depois.

ALTER TABLE public.loja_produtos
ADD COLUMN IF NOT EXISTS categoria_subcategoria_id bigint;

-- Se ja existir uma tabela de subcategorias especifica (ex.: public.loja_subcategorias
-- ou similar) e o nome for conhecido, o FK pode ser habilitado futuramente com algo como:
-- ALTER TABLE public.loja_produtos
--   ADD CONSTRAINT loja_produtos_categoria_subcategoria_fk
--   FOREIGN KEY (categoria_subcategoria_id)
--   REFERENCES public.loja_subcategorias(id);

COMMENT ON COLUMN public.loja_produtos.categoria_subcategoria_id IS
  'Subcategoria da Loja v0 vinculada ao produto (integracao com Admin > Loja > Categorias).';
