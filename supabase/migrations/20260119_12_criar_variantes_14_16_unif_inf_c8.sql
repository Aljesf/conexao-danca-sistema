BEGIN;

WITH
prod AS (
  SELECT id
  FROM public.loja_produtos
  WHERE codigo = 'UNIF-INF-C8'
  LIMIT 1
),
cor_preto AS (
  SELECT id
  FROM public.loja_cores
  WHERE upper(trim(nome)) = 'PRETO'
  LIMIT 1
),
t14 AS (
  SELECT id
  FROM public.loja_tamanhos
  WHERE tipo = 'ROUPA' AND nome = '14'
  LIMIT 1
),
t16 AS (
  SELECT id
  FROM public.loja_tamanhos
  WHERE tipo = 'ROUPA' AND nome = '16'
  LIMIT 1
)

-- Variante 14 (C8)
INSERT INTO public.loja_produto_variantes (
  produto_id,
  sku,
  cor_id,
  tamanho_id,
  preco_venda_centavos,
  estoque_atual,
  ativo
)
SELECT
  (SELECT id FROM prod),
  'UNIF-INF-C8-14',
  (SELECT id FROM cor_preto),
  (SELECT id FROM t14),
  10000,
  0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loja_produto_variantes v
  WHERE v.produto_id = (SELECT id FROM prod)
    AND v.cor_id = (SELECT id FROM cor_preto)
    AND v.tamanho_id = (SELECT id FROM t14)
)
AND NOT EXISTS (
  SELECT 1 FROM public.loja_produto_variantes v
  WHERE v.sku = 'UNIF-INF-C8-14'
);

-- Variante 16 (C8)
INSERT INTO public.loja_produto_variantes (
  produto_id,
  sku,
  cor_id,
  tamanho_id,
  preco_venda_centavos,
  estoque_atual,
  ativo
)
SELECT
  (SELECT id FROM prod),
  'UNIF-INF-C8-16',
  (SELECT id FROM cor_preto),
  (SELECT id FROM t16),
  10000,
  0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loja_produto_variantes v
  WHERE v.produto_id = (SELECT id FROM prod)
    AND v.cor_id = (SELECT id FROM cor_preto)
    AND v.tamanho_id = (SELECT id FROM t16)
)
AND NOT EXISTS (
  SELECT 1 FROM public.loja_produto_variantes v
  WHERE v.sku = 'UNIF-INF-C8-16'
);

COMMIT;
