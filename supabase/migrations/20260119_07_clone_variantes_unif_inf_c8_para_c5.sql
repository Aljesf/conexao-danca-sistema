BEGIN;

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
  p_c5.id,
  REPLACE(v.sku, 'UNIF-INF-C8', 'UNIF-INF-C5') AS sku,
  v.cor_id,
  v.tamanho_id,
  v.preco_venda_centavos,
  0,
  true
FROM public.loja_produto_variantes v
JOIN public.loja_produtos p_c8 ON p_c8.id = v.produto_id
JOIN public.loja_produtos p_c5 ON p_c5.codigo = 'UNIF-INF-C5'
WHERE p_c8.codigo = 'UNIF-INF-C8'
  AND NOT EXISTS (
    SELECT 1
    FROM public.loja_produto_variantes vx
    WHERE vx.produto_id = p_c5.id
      AND vx.tamanho_id = v.tamanho_id
      AND vx.cor_id = v.cor_id
  );

COMMIT;
