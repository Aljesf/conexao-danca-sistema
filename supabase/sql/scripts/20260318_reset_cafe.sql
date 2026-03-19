-- Reset operacional do Cafe.
-- Cancela o financeiro do Cafe sem excluir registros e preserva rastreabilidade.

begin;

-- Bloco 0: resolve o universo do Cafe sem tocar ESCOLA.
create temp table tmp_reset_cafe_cobrancas on commit drop as
with centro_cafe as (
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
)
select distinct
  c.id,
  c.status,
  c.cancelada_em,
  c.cancelamento_tipo,
  c.cancelamento_motivo,
  c.cancelada_motivo
from public.cobrancas c
left join public.centros_custo cc
  on cc.id = c.centro_custo_id
where upper(coalesce(c.origem_item_tipo, '')) = 'CAFE'
   or upper(coalesce(c.origem_tipo, '')) = 'CAFE'
   or c.centro_custo_id = (select id from centro_cafe)
   or upper(coalesce(cc.codigo, '')) = 'CAFE'
   or upper(coalesce(cc.nome, '')) like '%CAFE%';

create temp table tmp_reset_cafe_lancamentos on commit drop as
with centro_cafe as (
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
)
select distinct
  l.id,
  l.status,
  l.origem_sistema,
  l.origem_id,
  l.cobranca_id
from public.credito_conexao_lancamentos l
left join public.centros_custo cc
  on cc.id = l.centro_custo_id
where upper(coalesce(l.origem_sistema, '')) in ('CAFE', 'CAFE_CAIXA')
   or l.centro_custo_id = (select id from centro_cafe)
   or upper(coalesce(cc.codigo, '')) = 'CAFE'
   or upper(coalesce(cc.nome, '')) like '%CAFE%';

create temp table tmp_reset_cafe_vendas on commit drop as
select distinct
  v.id,
  v.status_pagamento,
  v.observacoes_internas
from public.cafe_vendas v
where v.cobranca_id in (select id from tmp_reset_cafe_cobrancas)
   or exists (
     select 1
     from tmp_reset_cafe_lancamentos l
     where upper(coalesce(l.origem_sistema, '')) = 'CAFE'
       and l.origem_id = v.id
   );

-- Bloco 1: registrar auditoria das cobrancas que serao canceladas neste reset.
insert into public.cobrancas_historico_eventos (
  cobranca_id,
  tipo_evento,
  payload_anterior,
  payload_novo,
  observacao,
  created_by
)
select
  c.id,
  'RESET_CAFE',
  jsonb_build_object(
    'status', c.status,
    'cancelada_em', c.cancelada_em,
    'cancelamento_tipo', c.cancelamento_tipo,
    'cancelamento_motivo', c.cancelamento_motivo,
    'cancelada_motivo', c.cancelada_motivo
  ),
  jsonb_build_object(
    'status', 'CANCELADA',
    'cancelada_em', now(),
    'cancelamento_tipo', 'RESET_OPERACIONAL_CAFE',
    'cancelamento_motivo', 'Reset inicial do cafe antes de operacao oficial',
    'cancelada_motivo', 'Reset inicial do cafe antes de operacao oficial'
  ),
  'Reset inicial do cafe antes de operacao oficial',
  null
from tmp_reset_cafe_cobrancas c
where upper(coalesce(c.status, '')) <> 'CANCELADA';

-- Bloco 2: cancelar cobrancas do Cafe sem alterar valores ou vencimentos.
update public.cobrancas c
set status = 'CANCELADA',
    cancelada_em = coalesce(c.cancelada_em, now()),
    cancelamento_tipo = 'RESET_OPERACIONAL_CAFE',
    cancelamento_motivo = 'Reset inicial do cafe antes de operacao oficial',
    cancelada_motivo = coalesce(c.cancelada_motivo, 'Reset inicial do cafe antes de operacao oficial'),
    updated_at = now()
where c.id in (
  select id
  from tmp_reset_cafe_cobrancas
  where upper(coalesce(status, '')) <> 'CANCELADA'
);

-- Bloco 3: cancelar lancamentos do Cafe.
update public.credito_conexao_lancamentos l
set status = 'CANCELADO',
    updated_at = now()
where l.id in (
  select id
  from tmp_reset_cafe_lancamentos
  where upper(coalesce(status, '')) <> 'CANCELADO'
);

-- Bloco 4: zerar o Cafe nas telas operacionais mantendo historico da venda.
-- A venda nao e apagada; apenas deixa de ficar ativa no caixa por status.
update public.cafe_vendas v
set status_pagamento = 'CANCELADO',
    updated_at = now(),
    observacoes_internas = case
      when upper(coalesce(v.observacoes_internas, '')) like '%RESET OPERACIONAL CAFE%' then v.observacoes_internas
      else concat_ws(
        E'\n',
        nullif(v.observacoes_internas, ''),
        '[RESET OPERACIONAL CAFE] Status financeiro cancelado para reinicio da operacao oficial.'
      )
    end
where v.id in (
  select id
  from tmp_reset_cafe_vendas
  where upper(coalesce(status_pagamento, '')) <> 'CANCELADO'
);

-- Conferencia final
select
  'cobrancas_cafe' as bloco,
  count(*) as quantidade,
  count(*) filter (where upper(coalesce(status, '')) = 'CANCELADA') as quantidade_cancelada
from public.cobrancas
where id in (select id from tmp_reset_cafe_cobrancas)
union all
select
  'lancamentos_cafe' as bloco,
  count(*) as quantidade,
  count(*) filter (where upper(coalesce(status, '')) = 'CANCELADO') as quantidade_cancelada
from public.credito_conexao_lancamentos
where id in (select id from tmp_reset_cafe_lancamentos)
union all
select
  'cafe_vendas' as bloco,
  count(*) as quantidade,
  count(*) filter (where upper(coalesce(status_pagamento, '')) = 'CANCELADO') as quantidade_cancelada
from public.cafe_vendas
where id in (select id from tmp_reset_cafe_vendas);

commit;
