-- Ambiente e colunas relevantes para ajuste de vencimento / cancelamento
select
  current_database() as database_name,
  current_user as current_user,
  now() as executed_at,
  current_setting('TimeZone', true) as timezone;

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'cobrancas' and column_name in (
      'vencimento',
      'vencimento_original',
      'vencimento_ajustado_em',
      'vencimento_ajustado_por',
      'vencimento_ajuste_motivo',
      'cancelada_em',
      'cancelada_por',
      'cancelada_por_user_id',
      'cancelamento_motivo',
      'cancelada_motivo',
      'cancelamento_tipo',
      'status'
    ))
    or (table_name = 'cobrancas_historico_eventos')
  )
order by table_name, column_name;

-- 1) Cobrancas vencidas em aberto
with recebimentos as (
  select cobranca_id, coalesce(sum(valor_centavos), 0)::bigint as total_recebido_centavos
  from public.recebimentos
  group by cobranca_id
)
select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.vencimento::date as vencimento,
  c.valor_centavos,
  coalesce(r.total_recebido_centavos, 0) as total_recebido_centavos,
  greatest(c.valor_centavos - coalesce(r.total_recebido_centavos, 0), 0) as saldo_centavos,
  c.pessoa_id,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id
from public.cobrancas c
left join recebimentos r on r.cobranca_id = c.id
where upper(coalesce(c.status, '')) <> 'CANCELADA'
  and coalesce(c.data_pagamento::text, '') = ''
  and greatest(c.valor_centavos - coalesce(r.total_recebido_centavos, 0), 0) > 0
  and c.vencimento::date < current_date
order by c.vencimento asc, c.id asc;

-- 2) Cobrancas em aberto vinculadas a matricula cancelada
with recebimentos as (
  select cobranca_id, coalesce(sum(valor_centavos), 0)::bigint as total_recebido_centavos
  from public.recebimentos
  group by cobranca_id
),
lancamento_principal as (
  select distinct on (l.cobranca_id)
    l.cobranca_id,
    l.id as lancamento_id,
    l.conta_conexao_id,
    l.matricula_id
  from public.credito_conexao_lancamentos l
  where l.cobranca_id is not null
  order by l.cobranca_id, l.id
)
select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.vencimento::date as vencimento,
  greatest(c.valor_centavos - coalesce(r.total_recebido_centavos, 0), 0) as saldo_centavos,
  coalesce(lp.matricula_id, case when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id else null end) as matricula_id,
  m.status as matricula_status,
  coalesce(nullif(to_jsonb(m) ->> 'cancelamento_tipo', ''), 'SEM_TIPO') as cancelamento_tipo,
  coalesce((to_jsonb(m) ->> 'gera_perda_financeira')::boolean, false) as gera_perda_financeira,
  lp.conta_conexao_id as conta_interna_id,
  p.nome as responsavel_financeiro_nome
from public.cobrancas c
left join recebimentos r on r.cobranca_id = c.id
left join lancamento_principal lp on lp.cobranca_id = c.id
left join public.matriculas m
  on m.id = coalesce(lp.matricula_id, case when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id else null end)
left join public.pessoas p on p.id = m.responsavel_financeiro_id
where upper(coalesce(c.status, '')) <> 'CANCELADA'
  and coalesce(c.data_pagamento::text, '') = ''
  and greatest(c.valor_centavos - coalesce(r.total_recebido_centavos, 0), 0) > 0
  and upper(coalesce(m.status, '')) = 'CANCELADA'
order by c.id desc;

-- 3) Cobrancas ja liquidadas que nao podem ser alteradas/canceladas
with recebimentos as (
  select cobranca_id, coalesce(sum(valor_centavos), 0)::bigint as total_recebido_centavos
  from public.recebimentos
  group by cobranca_id
)
select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.vencimento::date as vencimento,
  c.valor_centavos,
  coalesce(r.total_recebido_centavos, 0) as total_recebido_centavos,
  c.data_pagamento
from public.cobrancas c
left join recebimentos r on r.cobranca_id = c.id
where upper(coalesce(c.status, '')) in ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA')
   or c.data_pagamento is not null
   or coalesce(r.total_recebido_centavos, 0) >= c.valor_centavos
order by c.id desc;

-- 4) Cobrancas canceladas que ainda aparecem na visao flat
select
  c.id as cobranca_id,
  c.status,
  c.cancelada_em,
  c.cancelada_motivo,
  f.situacao_saas,
  f.saldo_aberto_centavos,
  f.vencimento
from public.cobrancas c
join public.vw_financeiro_contas_receber_flat f on f.cobranca_id = c.id
where upper(coalesce(c.status, '')) = 'CANCELADA'
order by c.id desc;

-- 5) Caso especifico da cobranca #287
with recebimentos as (
  select cobranca_id, coalesce(sum(valor_centavos), 0)::bigint as total_recebido_centavos
  from public.recebimentos
  where cobranca_id = 287
  group by cobranca_id
),
lancamento_principal as (
  select
    l.id as lancamento_id,
    l.conta_conexao_id,
    l.aluno_id,
    l.matricula_id
  from public.credito_conexao_lancamentos l
  where l.cobranca_id = 287
  order by l.id
  limit 1
)
select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.vencimento::date as vencimento,
  greatest(c.valor_centavos - coalesce(r.total_recebido_centavos, 0), 0) as saldo_centavos,
  c.origem_id as matricula_id,
  coalesce(lp.aluno_id, m.pessoa_id) as aluno_id,
  m.responsavel_financeiro_id as responsavel_id,
  lp.conta_conexao_id as conta_interna_id,
  lp.lancamento_id,
  m.status as matricula_status,
  coalesce(nullif(to_jsonb(m) ->> 'cancelamento_tipo', ''), 'SEM_TIPO') as cancelamento_tipo,
  coalesce((to_jsonb(m) ->> 'gera_perda_financeira')::boolean, false) as gera_perda_financeira,
  case
    when upper(coalesce(c.status, '')) = 'CANCELADA' then false
    when c.data_pagamento is not null then false
    when coalesce(r.total_recebido_centavos, 0) > 0 then false
    else true
  end as elegivel_cancelamento,
  case
    when upper(coalesce(c.status, '')) = 'CANCELADA' then false
    when c.data_pagamento is not null then false
    when coalesce(r.total_recebido_centavos, 0) >= c.valor_centavos then false
    else true
  end as elegivel_alteracao_vencimento
from public.cobrancas c
left join recebimentos r on r.cobranca_id = c.id
left join lancamento_principal lp on true
left join public.matriculas m
  on m.id = coalesce(lp.matricula_id, case when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id else null end)
where c.id = 287;
