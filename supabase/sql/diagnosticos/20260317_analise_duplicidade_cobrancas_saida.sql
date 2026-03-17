with grupos_duplicados as (
  select
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos,
    count(*) as quantidade_cobrancas_grupo,
    array_agg(c.id order by c.id) as ids_grupo_duplicado
  from public.cobrancas c
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
  group by
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos
  having count(*) > 1
),
faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
)
select
  c.id as cobranca_id,
  p.nome as pessoa_nome,
  c.pessoa_id,
  c.competencia_ano_mes,
  c.valor_centavos,
  c.valor_centavos / 100.0 as valor_reais,
  c.origem_tipo,
  c.origem_id,
  c.status,
  (coalesce(fpc.qtd_faturas, 0) > 0) as possui_fatura,
  gd.quantidade_cobrancas_grupo,
  gd.ids_grupo_duplicado,
  case
    when coalesce(fpc.qtd_faturas, 0) > 0 then 'MANTER_VINCULADA'
    else 'REVISAR_DUPLICADA'
  end as recomendacao_tecnica
from public.cobrancas c
join grupos_duplicados gd
  on gd.pessoa_id = c.pessoa_id
 and gd.competencia_ano_mes is not distinct from c.competencia_ano_mes
 and gd.valor_centavos = c.valor_centavos
left join public.pessoas p
  on p.id = c.pessoa_id
left join faturas_por_cobranca fpc
  on fpc.cobranca_id = c.id
where upper(coalesce(c.status, '')) <> 'CANCELADA'
order by
  p.nome,
  c.competencia_ano_mes,
  c.valor_centavos,
  (coalesce(fpc.qtd_faturas, 0) > 0) desc,
  c.id;
