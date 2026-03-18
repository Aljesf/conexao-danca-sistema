-- Backfill controlado do centro de custo real.
-- Regras:
-- - NAO altera centro de custo da conta interna
-- - corrige apenas o centro de custo do lancamento
-- - a cobranca so herda o centro do lancamento quando houver um centro univoco
-- - se nao for possivel determinar, deixa para revisao

begin;

with centros_base as (
  select
    max(case when ecf.id = 1 then ecf.centro_custo_padrao_escola_id end) as centro_escola_config_id
  from public.escola_config_financeira ecf
),
centros_resolvidos as (
  select
    coalesce(
      max(cb.centro_escola_config_id),
      max(case when upper(cc.codigo) = 'ESCOLA' then cc.id end)
    ) as centro_escola_id,
    max(case when upper(cc.codigo) = 'CAFE' then cc.id end) as centro_cafe_id,
    max(case when upper(cc.codigo) = 'LOJA' then cc.id end) as centro_loja_id
  from centros_base cb
  cross join public.centros_custo cc
),
lancamentos_esperados as (
  select
    l.id as lancamento_id,
    case
      when upper(coalesce(l.origem_sistema, '')) in ('MATRICULA', 'MATRICULA_REPROCESSAR', 'MATRICULA_MENSAL', 'MENSALIDADE')
        then cr.centro_escola_id
      when upper(coalesce(l.origem_sistema, '')) = 'CAFE'
        then cr.centro_cafe_id
      when upper(coalesce(l.origem_sistema, '')) in ('LOJA', 'LOJA_VENDA')
        then cr.centro_loja_id
      else null
    end as centro_custo_esperado_id
  from public.credito_conexao_lancamentos l
  cross join centros_resolvidos cr
)
update public.credito_conexao_lancamentos l
set
  centro_custo_id = le.centro_custo_esperado_id,
  updated_at = now()
from lancamentos_esperados le
where l.id = le.lancamento_id
  and le.centro_custo_esperado_id is not null
  and coalesce(l.centro_custo_id, -1) <> le.centro_custo_esperado_id;

with cobrancas_centro_unico as (
  select
    l.cobranca_id,
    min(l.centro_custo_id) as centro_custo_lancamento_id
  from public.credito_conexao_lancamentos l
  where l.cobranca_id is not null
    and l.centro_custo_id is not null
  group by l.cobranca_id
  having count(distinct l.centro_custo_id) = 1
)
update public.cobrancas c
set
  centro_custo_id = ccu.centro_custo_lancamento_id,
  updated_at = now()
from cobrancas_centro_unico ccu
where c.id = ccu.cobranca_id
  and coalesce(c.centro_custo_id, -1) <> ccu.centro_custo_lancamento_id;

commit;

-- Conferencia 1: lancamentos ainda sem centro de custo resolvido
select
  l.id as lancamento_id,
  l.conta_conexao_id as conta_interna_id,
  l.origem_sistema,
  l.origem_id,
  l.descricao,
  l.cobranca_id
from public.credito_conexao_lancamentos l
where l.centro_custo_id is null
order by l.id desc;

-- Conferencia 2: cobrancas ainda divergentes do lancamento
with cobrancas_centro_unico as (
  select
    l.cobranca_id,
    min(l.centro_custo_id) as centro_custo_lancamento_id
  from public.credito_conexao_lancamentos l
  where l.cobranca_id is not null
    and l.centro_custo_id is not null
  group by l.cobranca_id
  having count(distinct l.centro_custo_id) = 1
)
select
  c.id as cobranca_id,
  c.descricao,
  c.centro_custo_id as centro_custo_cobranca_id,
  ccu.centro_custo_lancamento_id
from public.cobrancas c
join cobrancas_centro_unico ccu on ccu.cobranca_id = c.id
where coalesce(c.centro_custo_id, -1) <> ccu.centro_custo_lancamento_id
order by c.id desc;

-- Conferencia 3: cobrancas ambiguas, com mais de um centro de custo nos lancamentos
select
  l.cobranca_id,
  count(*) as qtd_lancamentos,
  count(distinct l.centro_custo_id) as qtd_centros_distintos
from public.credito_conexao_lancamentos l
where l.cobranca_id is not null
  and l.centro_custo_id is not null
group by l.cobranca_id
having count(distinct l.centro_custo_id) > 1
order by l.cobranca_id desc;
