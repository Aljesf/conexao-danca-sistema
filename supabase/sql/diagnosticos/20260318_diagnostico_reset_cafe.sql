-- Diagnostico operacional do reset do Cafe.
-- Nao executa UPDATE/DELETE e usa apenas estruturas temporarias da sessao.

create or replace temp view reset_cafe_centros_resolvidos as
select
  (
    select cc.id
    from public.centros_custo cc
    where upper(coalesce(cc.codigo, '')) = 'CAFE'
       or upper(coalesce(cc.nome, '')) like '%CAFE%'
       or exists (
         select 1
         from unnest(coalesce(cc.contextos_aplicaveis, array[]::text[])) as ctx(item)
         where upper(coalesce(ctx.item, '')) = 'CAFE'
       )
    order by
      case when upper(coalesce(cc.codigo, '')) = 'CAFE' then 0 else 1 end,
      cc.id
    limit 1
  ) as centro_cafe_id;

create or replace temp view reset_cafe_cobrancas as
with base as (
  select
    c.id,
    c.pessoa_id,
    c.descricao,
    c.status,
    c.valor_centavos,
    c.vencimento,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_item_tipo,
    c.origem_item_id,
    c.conta_interna_id,
    c.centro_custo_id,
    cc.codigo as centro_custo_codigo,
    cc.nome as centro_custo_nome,
    upper(coalesce(c.origem_item_tipo, '')) = 'CAFE' as match_origem_item_tipo,
    upper(coalesce(c.origem_tipo, '')) = 'CAFE' as match_origem_tipo,
    c.centro_custo_id = (select centro_cafe_id from reset_cafe_centros_resolvidos) as match_centro_custo_cafe,
    case
      when upper(coalesce(c.origem_item_tipo, '')) = 'CAFE'
        or upper(coalesce(c.origem_tipo, '')) = 'CAFE'
        or c.centro_custo_id = (select centro_cafe_id from reset_cafe_centros_resolvidos)
        or upper(coalesce(cc.codigo, '')) = 'CAFE'
        or upper(coalesce(cc.nome, '')) like '%CAFE%'
      then 'CAFE'
      else 'OUTRO'
    end as contexto_detectado
  from public.cobrancas c
  left join public.centros_custo cc
    on cc.id = c.centro_custo_id
)
select *
from base
where contexto_detectado = 'CAFE';

create or replace temp view reset_cafe_lancamentos as
with base as (
  select
    l.id,
    l.conta_conexao_id,
    l.cobranca_id,
    l.origem_sistema,
    l.origem_id,
    l.status,
    l.valor_centavos,
    l.data_lancamento,
    l.referencia_item,
    l.centro_custo_id,
    cc.codigo as centro_custo_codigo,
    cc.nome as centro_custo_nome,
    upper(coalesce(l.origem_sistema, '')) in ('CAFE', 'CAFE_CAIXA') as match_origem_sistema_cafe,
    l.centro_custo_id = (select centro_cafe_id from reset_cafe_centros_resolvidos) as match_centro_custo_cafe,
    case
      when upper(coalesce(l.origem_sistema, '')) in ('CAFE', 'CAFE_CAIXA')
        or l.centro_custo_id = (select centro_cafe_id from reset_cafe_centros_resolvidos)
        or upper(coalesce(cc.codigo, '')) = 'CAFE'
        or upper(coalesce(cc.nome, '')) like '%CAFE%'
      then 'CAFE'
      else 'OUTRO'
    end as contexto_detectado
  from public.credito_conexao_lancamentos l
  left join public.centros_custo cc
    on cc.id = l.centro_custo_id
)
select *
from base
where contexto_detectado = 'CAFE';

create or replace temp view reset_cafe_vendas_relacionadas as
select
  v.id,
  v.data_operacao,
  v.data_competencia,
  v.cobranca_id,
  v.status_pagamento,
  v.tipo_quitacao,
  v.valor_total_centavos,
  v.valor_pago_centavos,
  v.valor_em_aberto_centavos,
  case
    when v.cobranca_id is not null then 'COBRANCA_VINCULADA'
    when exists (
      select 1
      from reset_cafe_lancamentos l
      where l.origem_sistema = 'CAFE'
        and l.origem_id = v.id
    ) then 'LANCAMENTO_CAFE'
    else 'OUTRO'
  end as vinculo_financeiro_cafe
from public.cafe_vendas v
where v.cobranca_id in (select id from reset_cafe_cobrancas)
   or exists (
     select 1
     from reset_cafe_lancamentos l
     where l.origem_sistema = 'CAFE'
       and l.origem_id = v.id
   );

-- Resumo consolidado do universo Cafe no financeiro
select
  'COBRANCAS_CAFE' as bloco,
  count(*) as quantidade_registros,
  coalesce(sum(valor_centavos), 0) as total_valor_centavos,
  count(*) filter (where upper(coalesce(status, '')) = 'CANCELADA') as quantidade_canceladas,
  count(*) filter (where upper(coalesce(status, '')) <> 'CANCELADA') as quantidade_ativas
from reset_cafe_cobrancas
union all
select
  'LANCAMENTOS_CAFE' as bloco,
  count(*) as quantidade_registros,
  coalesce(sum(valor_centavos), 0) as total_valor_centavos,
  count(*) filter (where upper(coalesce(status, '')) = 'CANCELADO') as quantidade_canceladas,
  count(*) filter (where upper(coalesce(status, '')) <> 'CANCELADO') as quantidade_ativas
from reset_cafe_lancamentos
union all
select
  'CAFE_VENDAS_RELACIONADAS' as bloco,
  count(*) as quantidade_registros,
  coalesce(sum(valor_total_centavos), 0) as total_valor_centavos,
  count(*) filter (where upper(coalesce(status_pagamento, '')) = 'CANCELADO') as quantidade_canceladas,
  count(*) filter (where upper(coalesce(status_pagamento, '')) <> 'CANCELADO') as quantidade_ativas
from reset_cafe_vendas_relacionadas;

-- Cobrancas do Cafe por status/origem
select
  status,
  coalesce(origem_tipo, 'SEM_ORIGEM') as origem_tipo,
  coalesce(origem_item_tipo, 'SEM_ITEM') as origem_item_tipo,
  count(*) as quantidade,
  coalesce(sum(valor_centavos), 0) as total_valor_centavos
from reset_cafe_cobrancas
group by status, coalesce(origem_tipo, 'SEM_ORIGEM'), coalesce(origem_item_tipo, 'SEM_ITEM')
order by status, origem_tipo, origem_item_tipo;

-- Lancamentos do Cafe por status/origem
select
  status,
  coalesce(origem_sistema, 'SEM_ORIGEM') as origem_sistema,
  count(*) as quantidade,
  coalesce(sum(valor_centavos), 0) as total_valor_centavos
from reset_cafe_lancamentos
group by status, coalesce(origem_sistema, 'SEM_ORIGEM')
order by status, origem_sistema;

-- Detalhe de cobrancas do Cafe
select
  id,
  pessoa_id,
  descricao,
  status,
  valor_centavos,
  vencimento,
  origem_tipo,
  origem_subtipo,
  origem_item_tipo,
  origem_item_id,
  conta_interna_id,
  centro_custo_id,
  centro_custo_codigo,
  centro_custo_nome,
  match_origem_item_tipo,
  match_origem_tipo,
  match_centro_custo_cafe
from reset_cafe_cobrancas
order by id desc;

-- Detalhe de lancamentos do Cafe
select
  id,
  conta_conexao_id,
  cobranca_id,
  origem_sistema,
  origem_id,
  status,
  valor_centavos,
  data_lancamento,
  referencia_item,
  centro_custo_id,
  centro_custo_codigo,
  centro_custo_nome,
  match_origem_sistema_cafe,
  match_centro_custo_cafe
from reset_cafe_lancamentos
order by id desc;

-- Vendas relacionadas ao financeiro do Cafe, para medir impacto nas telas do caixa
select
  id,
  data_operacao,
  data_competencia,
  cobranca_id,
  status_pagamento,
  tipo_quitacao,
  valor_total_centavos,
  valor_pago_centavos,
  valor_em_aberto_centavos,
  vinculo_financeiro_cafe
from reset_cafe_vendas_relacionadas
order by id desc;
