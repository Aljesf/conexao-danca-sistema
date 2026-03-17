-- BLOCO A
select
  c.id as cobranca_id,
  p.nome as pessoa_nome,
  c.origem_tipo,
  c.origem_id,
  c.status
from public.cobrancas c
left join public.pessoas p
  on p.id = c.pessoa_id
where c.id in (216, 258, 272, 285, 313, 412)
order by c.id;

-- BLOCO B
with cobrancas_ativas as (
  select
    c.id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos,
    c.origem_tipo
  from public.cobrancas c
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_matricula_x_fatura as (
  select
    ca.pessoa_id,
    ca.competencia_ano_mes,
    ca.valor_centavos
  from cobrancas_ativas ca
  group by
    ca.pessoa_id,
    ca.competencia_ano_mes,
    ca.valor_centavos
  having count(*) = 2
     and count(*) filter (where upper(coalesce(ca.origem_tipo, '')) = 'MATRICULA') >= 1
     and count(*) filter (where upper(coalesce(ca.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') >= 1
)
select
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos,
  count(*) as quantidade
from cobrancas_ativas ca
join grupos_matricula_x_fatura g
  on g.pessoa_id = ca.pessoa_id
 and g.competencia_ano_mes is not distinct from ca.competencia_ano_mes
 and g.valor_centavos = ca.valor_centavos
group by
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos
order by
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos;

-- BLOCO C
with cobrancas_ativas as (
  select
    c.id as cobranca_id,
    c.pessoa_id,
    p.nome as pessoa_nome,
    c.competencia_ano_mes,
    c.valor_centavos,
    c.origem_tipo
  from public.cobrancas c
  left join public.pessoas p
    on p.id = c.pessoa_id
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_duplicados as (
  select
    ca.pessoa_id,
    ca.pessoa_nome,
    ca.competencia_ano_mes,
    ca.valor_centavos,
    count(*) as quantidade_cobrancas,
    array_agg(ca.cobranca_id order by ca.cobranca_id) as cobrancas_ids,
    count(*) filter (where upper(coalesce(ca.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') as qtd_origem_fatura_credito_conexao,
    count(*) filter (where upper(coalesce(ca.origem_tipo, '')) = 'MATRICULA') as qtd_origem_matricula
  from cobrancas_ativas ca
  group by
    ca.pessoa_id,
    ca.pessoa_nome,
    ca.competencia_ano_mes,
    ca.valor_centavos
  having count(*) > 1
)
select
  gd.pessoa_id,
  gd.pessoa_nome,
  gd.competencia_ano_mes,
  gd.valor_centavos,
  gd.quantidade_cobrancas,
  gd.cobrancas_ids,
  case
    when gd.quantidade_cobrancas >= 3 then 'TRIPLA_OU_MAIS'
    when gd.quantidade_cobrancas = 2
     and gd.qtd_origem_fatura_credito_conexao = 2 then 'FATURA_DUPLA'
    else 'OUTRO'
  end as classificacao_grupo
from grupos_duplicados gd
order by
  classificacao_grupo,
  gd.pessoa_nome,
  gd.valor_centavos;

-- BLOCO D
with cobrancas_ativas as (
  select
    c.id as cobranca_id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos
  from public.cobrancas c
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_duplicados as (
  select
    ca.pessoa_id,
    ca.competencia_ano_mes,
    ca.valor_centavos,
    count(*) as quantidade_cobrancas
  from cobrancas_ativas ca
  group by
    ca.pessoa_id,
    ca.competencia_ano_mes,
    ca.valor_centavos
  having count(*) > 1
)
select
  count(*) as grupos_duplicados_restantes,
  coalesce(sum(gd.quantidade_cobrancas), 0) as cobrancas_envolvidas_restantes
from grupos_duplicados gd;
