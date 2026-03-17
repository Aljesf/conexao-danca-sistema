-- Diagnostico de duplicidade de cobrancas
-- Data: 2026-03-17
-- Objetivo:
-- 1) detectar cobrancas potencialmente duplicadas;
-- 2) detalhar os registros e seus vinculos com faturas;
-- 3) classificar casos provaveis de falha de vinculo;
-- 4) oferecer uma visao final para revisao manual.
--
-- Observacoes:
-- - este arquivo nao altera schema nem dados;
-- - o filtro considera apenas cobrancas nao canceladas;
-- - faturas sao agregadas por cobranca para evitar linhas duplicadas no diagnostico.

-- ============================================================================
-- 1) Deteccao de cobrancas duplicadas
-- ============================================================================

with cobrancas_ativas as (
  select
    c.id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos
  from public.cobrancas c
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
)
select
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos,
  count(*) as quantidade,
  array_agg(ca.id order by ca.id) as cobrancas_ids
from cobrancas_ativas ca
group by
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos
having count(*) > 1
order by
  quantidade desc,
  ca.pessoa_id,
  ca.competencia_ano_mes,
  ca.valor_centavos;

-- ============================================================================
-- 2) Detalhamento das duplicadas
-- ============================================================================

with duplicadas as (
  select
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos
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
    count(*) as qtd_faturas,
    array_agg(f.id order by f.id desc) as faturas_ids
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
)
select
  c.id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  c.competencia_ano_mes,
  c.valor_centavos,
  c.status,
  c.origem_tipo,
  c.origem_id,
  coalesce(fpc.qtd_faturas, 0) as qtd_faturas,
  fpc.faturas_ids,
  case
    when coalesce(fpc.qtd_faturas, 0) > 0 then 'VINCULADA_FATURA'
    else 'SEM_FATURA'
  end as status_fatura
from public.cobrancas c
left join public.pessoas p
  on p.id = c.pessoa_id
left join faturas_por_cobranca fpc
  on fpc.cobranca_id = c.id
join duplicadas d
  on d.pessoa_id = c.pessoa_id
 and d.competencia_ano_mes is not distinct from c.competencia_ano_mes
 and d.valor_centavos = c.valor_centavos
where upper(coalesce(c.status, '')) <> 'CANCELADA'
order by
  c.pessoa_id,
  c.competencia_ano_mes,
  c.valor_centavos,
  coalesce(fpc.qtd_faturas, 0) desc,
  c.id;

-- ============================================================================
-- 3) Classificacao: casos com falha provavel de vinculo
-- Regra:
-- - ha duplicidade no grupo;
-- - pelo menos uma cobranca tem fatura;
-- - pelo menos uma cobranca do mesmo grupo nao tem fatura.
-- ============================================================================

with faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
),
base as (
  select
    c.id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos,
    case
      when coalesce(fpc.qtd_faturas, 0) > 0 then 1
      else 0
    end as tem_fatura
  from public.cobrancas c
  left join faturas_por_cobranca fpc
    on fpc.cobranca_id = c.id
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
)
select
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos,
  sum(b.tem_fatura) as qtd_com_fatura,
  count(*) as total,
  array_agg(b.id order by b.tem_fatura desc, b.id) as cobrancas_ids
from base b
group by
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos
having count(*) > 1
   and sum(b.tem_fatura) >= 1
   and sum(b.tem_fatura) < count(*)
order by
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos;

-- ============================================================================
-- 4) Visao final para ajuste manual
-- ============================================================================

with duplicadas as (
  select
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos
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
  c.id,
  p.nome as pessoa_nome,
  c.competencia_ano_mes,
  c.valor_centavos / 100.0 as valor_reais,
  c.status,
  coalesce(fpc.qtd_faturas, 0) as qtd_faturas,
  case
    when coalesce(fpc.qtd_faturas, 0) > 0 then 'MANTER (TEM FATURA)'
    else 'REVISAR (PROVAVEL DUPLICADA)'
  end as recomendacao
from public.cobrancas c
left join public.pessoas p
  on p.id = c.pessoa_id
left join faturas_por_cobranca fpc
  on fpc.cobranca_id = c.id
join duplicadas d
  on d.pessoa_id = c.pessoa_id
 and d.competencia_ano_mes is not distinct from c.competencia_ano_mes
 and d.valor_centavos = c.valor_centavos
where upper(coalesce(c.status, '')) <> 'CANCELADA'
order by
  p.nome nulls last,
  c.competencia_ano_mes,
  c.valor_centavos,
  coalesce(fpc.qtd_faturas, 0) desc,
  c.id;
