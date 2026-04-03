-- Auditoria do caso de duplicidade da conta interna / fatura mensal.
-- Caso base:
--   pessoa_id = 36
--   conta_conexao_id = 41
--   fatura_id = 364
--   cobrancas = 445, 455
--   recebimentos = 75, 76
--   competencia = 2026-03
--   matricula_id = 122

-- A) Cobrancas envolvidas
select
  c.*
from public.cobrancas c
where c.id in (445, 455)
order by c.id;

-- B) Recebimentos envolvidos
select
  r.*
from public.recebimentos r
where r.id in (75, 76)
order by r.id;

-- C) Conta interna / Cartao Conexao do aluno
select
  cc.*
from public.credito_conexao_contas cc
where cc.id = 41;

-- D) Faturas da conta e destaque da fatura auditada
select
  f.*
from public.credito_conexao_faturas f
where f.id = 364
   or f.conta_conexao_id = 41
order by f.periodo_referencia, f.id;

-- E) Lancamentos da conta interna da competencia auditada
select
  l.*
from public.credito_conexao_lancamentos l
where l.conta_conexao_id = 41
  and (
    l.competencia = '2026-03'
    or l.data_lancamento between date '2026-03-01' and date '2026-03-31'
  )
order by l.created_at nulls first, l.id;

-- F) Relacao fatura x lancamentos
select
  fl.*,
  l.cobranca_id,
  l.referencia_item,
  l.origem_sistema,
  l.origem_id,
  l.matricula_id,
  l.status as lancamento_status,
  l.valor_centavos
from public.credito_conexao_fatura_lancamentos fl
join public.credito_conexao_lancamentos l
  on l.id = fl.lancamento_id
where fl.fatura_id = 364
order by fl.lancamento_id;

-- G) Origem por matricula / reprocessamento
select
  c.id,
  c.created_at,
  c.updated_at,
  c.descricao,
  c.valor_centavos,
  c.vencimento,
  c.data_pagamento,
  c.status,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id,
  c.competencia_ano_mes,
  c.conta_interna_id,
  c.origem_agrupador_tipo,
  c.origem_agrupador_id,
  c.origem_item_tipo,
  c.origem_item_id,
  c.origem_label
from public.cobrancas c
where c.pessoa_id = 36
  and (
    c.origem_id = 122
    or c.descricao ilike '%matricula%'
    or c.descricao ilike '%reprocess%'
    or c.competencia_ano_mes = '2026-03'
  )
order by c.created_at, c.id;

-- H) Recebimentos ligados as cobrancas auditadas
select
  r.*,
  c.descricao as cobranca_descricao,
  c.competencia_ano_mes,
  c.status as cobranca_status
from public.recebimentos r
join public.cobrancas c
  on c.id = r.cobranca_id
where c.id in (445, 455)
order by r.id;

-- I) Origem operacional da matricula
select
  m.*
from public.matriculas m
where m.id = 122
   or m.pessoa_id = 36
order by m.created_at desc;

-- J) Linha do tempo consolidada do caso
with params as (
  select
    41::bigint as conta_conexao_id,
    '2026-03'::text as competencia,
    122::bigint as matricula_id
),
eventos as (
  select
    'COBRANCA'::text as evento,
    c.created_at as ocorrido_em,
    c.id::text as registro_id,
    jsonb_build_object(
      'status', c.status,
      'descricao', c.descricao,
      'competencia', c.competencia_ano_mes,
      'valor_centavos', c.valor_centavos,
      'conta_interna_id', c.conta_interna_id,
      'origem_tipo', c.origem_tipo,
      'origem_subtipo', c.origem_subtipo,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id
    ) as payload
  from public.cobrancas c, params p
  where c.id in (445, 455)
     or (
       c.conta_interna_id = p.conta_conexao_id
       and c.competencia_ano_mes = p.competencia
     )

  union all

  select
    'RECEBIMENTO'::text as evento,
    coalesce(r.created_at, r.data_pagamento) as ocorrido_em,
    r.id::text as registro_id,
    jsonb_build_object(
      'cobranca_id', r.cobranca_id,
      'valor_centavos', r.valor_centavos,
      'data_pagamento', r.data_pagamento,
      'metodo_pagamento', r.metodo_pagamento,
      'origem_sistema', r.origem_sistema
    ) as payload
  from public.recebimentos r
  where r.id in (75, 76)

  union all

  select
    'LANCAMENTO'::text as evento,
    coalesce(l.created_at, l.data_lancamento::timestamptz) as ocorrido_em,
    l.id::text as registro_id,
    jsonb_build_object(
      'status', l.status,
      'cobranca_id', l.cobranca_id,
      'competencia', l.competencia,
      'valor_centavos', l.valor_centavos,
      'referencia_item', l.referencia_item,
      'origem_sistema', l.origem_sistema,
      'origem_id', l.origem_id,
      'matricula_id', l.matricula_id
    ) as payload
  from public.credito_conexao_lancamentos l, params p
  where l.conta_conexao_id = p.conta_conexao_id
    and l.competencia = p.competencia

  union all

  select
    'FATURA'::text as evento,
    f.created_at as ocorrido_em,
    f.id::text as registro_id,
    jsonb_build_object(
      'status', f.status,
      'periodo_referencia', f.periodo_referencia,
      'valor_total_centavos', f.valor_total_centavos,
      'data_vencimento', f.data_vencimento,
      'cobranca_id', f.cobranca_id
    ) as payload
  from public.credito_conexao_faturas f
  where f.id = 364

  union all

  select
    'FATURA_LANCAMENTO'::text as evento,
    fl.created_at as ocorrido_em,
    concat(fl.fatura_id, ':', fl.lancamento_id) as registro_id,
    jsonb_build_object(
      'fatura_id', fl.fatura_id,
      'lancamento_id', fl.lancamento_id
    ) as payload
  from public.credito_conexao_fatura_lancamentos fl
  where fl.fatura_id = 364
)
select *
from eventos
order by ocorrido_em nulls first, evento, registro_id;

-- K) Duplicidade por unidade de negocio na conta interna
with params as (
  select
    41::bigint as conta_conexao_id,
    122::bigint as matricula_id
),
lancamentos as (
  select
    l.*,
    case
      when l.matricula_id is not null then concat('MATRICULA:', l.matricula_id, '|', coalesce(l.competencia, 'SEM_COMPETENCIA'))
      when upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' and l.origem_id is not null
        then concat('MATRICULA:', l.origem_id, '|', coalesce(l.competencia, 'SEM_COMPETENCIA'))
      else concat(coalesce(l.origem_sistema, 'SEM_ORIGEM'), ':', coalesce(l.origem_id::text, 'SEM_ID'), '|', coalesce(l.competencia, 'SEM_COMPETENCIA'))
    end as chave_negocio
  from public.credito_conexao_lancamentos l, params p
  where l.conta_conexao_id = p.conta_conexao_id
    and (
      l.matricula_id = p.matricula_id
      or (upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' and l.origem_id = p.matricula_id)
    )
)
select
  chave_negocio,
  count(*) as quantidade_lancamentos,
  array_agg(id order by created_at, id) as lancamento_ids,
  array_agg(coalesce(referencia_item, '(sem referencia)') order by created_at, id) as referencias,
  array_agg(coalesce(cobranca_id::text, '(sem cobranca)') order by created_at, id) as cobranca_ids
from lancamentos
group by chave_negocio
having count(*) > 1
order by chave_negocio;

-- L) Fatura canonica x leitura operacional / dashboards
select
  f.id as fatura_id,
  f.periodo_referencia,
  f.status as fatura_status,
  f.valor_total_centavos,
  f.cobranca_id,
  c.status as cobranca_status,
  c.data_pagamento,
  c.valor_centavos as cobranca_valor_centavos
from public.credito_conexao_faturas f
left join public.cobrancas c
  on c.id = f.cobranca_id
where f.id = 364;

select
  flat.*
from public.vw_financeiro_contas_receber_flat flat
where flat.cobranca_id in (445, 455)
   or flat.pessoa_id = 36
order by flat.cobranca_id;

select
  op.*
from public.vw_financeiro_cobrancas_operacionais op
where op.cobranca_id in (445, 455)
   or (
     op.conta_conexao_id = 41
     and op.competencia_ano_mes = '2026-03'
   )
order by op.competencia_ano_mes, op.cobranca_id;

select
  vf.*
from public.vw_pessoa_resumo_financeiro vf
where vf.pessoa_id = 36;

-- M) Por que a fatura 364 permaneceu aberta/em atraso
with itens as (
  select
    f.id as fatura_id,
    f.status as fatura_status,
    f.data_vencimento,
    f.valor_total_centavos,
    l.id as lancamento_id,
    l.status as lancamento_status,
    l.valor_centavos as lancamento_valor_centavos,
    l.cobranca_id,
    c.status as cobranca_status,
    c.data_pagamento
  from public.credito_conexao_faturas f
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.fatura_id = f.id
  left join public.credito_conexao_lancamentos l
    on l.id = fl.lancamento_id
  left join public.cobrancas c
    on c.id = l.cobranca_id
  where f.id = 364
)
select
  fatura_id,
  fatura_status,
  data_vencimento,
  valor_total_centavos,
  count(lancamento_id) as quantidade_lancamentos,
  sum(case when upper(coalesce(cobranca_status, '')) in ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA') then lancamento_valor_centavos else 0 end) as valor_itens_quitados,
  sum(case when upper(coalesce(cobranca_status, '')) not in ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA') then lancamento_valor_centavos else 0 end) as valor_itens_nao_quitados,
  array_agg(distinct cobranca_id) filter (where cobranca_id is not null) as cobrancas_relacionadas
from itens
group by fatura_id, fatura_status, data_vencimento, valor_total_centavos;
