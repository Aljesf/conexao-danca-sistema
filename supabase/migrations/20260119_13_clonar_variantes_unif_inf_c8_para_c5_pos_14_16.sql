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
  p_c5.id AS produto_id,
  'UNIF-INF-C5-' || t.nome AS sku,
  v.cor_id,
  v.tamanho_id,
  v.preco_venda_centavos,
  0 AS estoque_atual,
  true AS ativo
FROM public.loja_produto_variantes v
JOIN public.loja_produtos p_c8 ON p_c8.id = v.produto_id
JOIN public.loja_produtos p_c5 ON p_c5.codigo = 'UNIF-INF-C5'
JOIN public.loja_tamanhos t ON t.id = v.tamanho_id
WHERE p_c8.codigo = 'UNIF-INF-C8'
  AND NOT EXISTS (
    SELECT 1
    FROM public.loja_produto_variantes vx
    WHERE vx.produto_id = p_c5.id
      AND vx.tamanho_id = v.tamanho_id
      AND vx.cor_id = v.cor_id
  );

COMMIT;

-- Validacao C8 e C5 (deve aparecer 02,04,06,08,10,12,14,16)
SELECT
  p.codigo,
  v.sku,
  t.nome AS tamanho,
  c.nome AS cor,
  v.preco_venda_centavos
FROM public.loja_produto_variantes v
JOIN public.loja_produtos p ON p.id = v.produto_id
JOIN public.loja_tamanhos t ON t.id = v.tamanho_id
LEFT JOIN public.loja_cores c ON c.id = v.cor_id
WHERE p.codigo IN ('UNIF-INF-C8','UNIF-INF-C5')
ORDER BY p.codigo, t.ordem, t.nome;
