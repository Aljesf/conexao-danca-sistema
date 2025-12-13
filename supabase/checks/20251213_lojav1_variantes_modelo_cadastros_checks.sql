select 'loja_marcas' as tabela, count(*) from public.loja_marcas
union all
select 'loja_cores' as tabela, count(*) from public.loja_cores
union all
select 'loja_numeracoes' as tabela, count(*) from public.loja_numeracoes
union all
select 'loja_tamanhos' as tabela, count(*) from public.loja_tamanhos
union all
select 'loja_modelos' as tabela, count(*) from public.loja_modelos
union all
select 'loja_produto_variantes' as tabela, count(*) from public.loja_produto_variantes;

-- Exemplo de busca "produto X + cor Rosa + numeracao 36"
-- (substitua os IDs conforme seus cadastros)
-- select v.*
-- from public.loja_produto_variantes v
-- where v.produto_id = 123 and v.cor_id = 10 and v.numeracao_id = 5 and v.ativo = true;
