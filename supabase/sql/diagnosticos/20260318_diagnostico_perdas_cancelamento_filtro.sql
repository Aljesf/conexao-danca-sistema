-- Diagnostico da tela "Perdas por cancelamento de matricula"
-- Objetivo: identificar por que casos recentes, inclusive cobrancas canceladas manualmente,
-- ainda nao entram na lista detalhada de perdas.
--
-- Este arquivo NAO executa UPDATE.

-- =========================================================
-- BLOCO 1 - Matriculas canceladas recentes
-- =========================================================
with encerramento_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.tipo,
    me.motivo,
    me.realizado_em,
    me.cobrancas_canceladas_valor_centavos
  from public.matriculas_encerramentos me
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
)
select
  m.id as matricula_id,
  m.pessoa_id as aluno_id,
  p.nome as aluno_nome,
  m.responsavel_financeiro_id,
  rf.nome as responsavel_financeiro_nome,
  m.status,
  m.cancelamento_tipo,
  m.gera_perda_financeira,
  m.encerramento_em,
  m.data_encerramento,
  er.tipo as encerramento_tipo,
  er.motivo as cancelamento_motivo,
  er.realizado_em as data_cancelamento,
  er.cobrancas_canceladas_valor_centavos
from public.matriculas m
left join public.pessoas p on p.id = m.pessoa_id
left join public.pessoas rf on rf.id = m.responsavel_financeiro_id
left join encerramento_recente er on er.matricula_id = m.id
where m.status = 'CANCELADA'
order by coalesce(er.realizado_em, m.encerramento_em, m.data_encerramento) desc nulls last
limit 100;

-- =========================================================
-- BLOCO 2 - Cobrancas canceladas recentes ligadas a matricula
-- =========================================================
with cobrancas_canceladas_recentemente as (
  select
    c.id as cobranca_id,
    c.origem_id as matricula_id,
    c.cancelada_em,
    c.cancelamento_tipo,
    coalesce(c.cancelamento_motivo, c.cancelada_motivo) as cancelamento_motivo,
    c.status,
    c.conta_interna_id,
    c.valor_centavos,
    coalesce(vw.saldo_aberto_centavos, c.valor_centavos) as saldo_aparente
  from public.cobrancas c
  left join public.vw_financeiro_contas_receber_flat vw on vw.cobranca_id = c.id
  where c.origem_tipo = 'MATRICULA'
    and c.status = 'CANCELADA'
    and c.cancelada_em is not null
)
select
  ccr.cobranca_id,
  ccr.matricula_id,
  m.pessoa_id as aluno_id,
  p.nome as aluno_nome,
  m.responsavel_financeiro_id,
  rf.nome as responsavel_financeiro_nome,
  m.status as status_matricula,
  m.cancelamento_tipo as matricula_cancelamento_tipo,
  m.gera_perda_financeira,
  ccr.cancelada_em,
  ccr.cancelamento_tipo,
  ccr.cancelamento_motivo,
  ccr.status,
  ccr.saldo_aparente as saldo,
  ccr.conta_interna_id
from cobrancas_canceladas_recentemente ccr
join public.matriculas m on m.id = ccr.matricula_id
left join public.pessoas p on p.id = m.pessoa_id
left join public.pessoas rf on rf.id = m.responsavel_financeiro_id
order by ccr.cancelada_em desc nulls last, ccr.cobranca_id desc;

-- =========================================================
-- BLOCO 3 - Casos que entram HOJE na tela de perdas
-- Replica a regra atual: DESISTENCIA_REAL + gera_perda_financeira = true
-- =========================================================
with encerramento_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.motivo,
    me.realizado_em,
    me.cobrancas_canceladas_valor_centavos
  from public.matriculas_encerramentos me
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
),
abertas as (
  select
    vw.origem_id as matricula_id,
    count(*) as titulos_abertos,
    sum(vw.saldo_aberto_centavos) as saldo_aberto_total
  from public.vw_financeiro_contas_receber_flat vw
  where vw.origem_tipo = 'MATRICULA'
    and vw.saldo_aberto_centavos > 0
    and upper(coalesce(vw.status_cobranca, '')) <> 'CANCELADA'
  group by vw.origem_id
)
select
  m.id as matricula_id,
  p.nome as aluno_nome,
  rf.nome as responsavel_financeiro_nome,
  m.cancelamento_tipo,
  m.gera_perda_financeira,
  er.motivo as cancelamento_motivo,
  coalesce(er.realizado_em, m.encerramento_em, m.data_encerramento) as data_cancelamento,
  coalesce(a.titulos_abertos, 0) as titulos_abertos,
  coalesce(a.saldo_aberto_total, 0) as saldo_aberto_total,
  coalesce(er.cobrancas_canceladas_valor_centavos, m.total_mensalidade_centavos, 0) as valor_potencial,
  'DESISTENCIA_REAL + gera_perda_financeira = true' as filtro_atual_satisfeito
from public.matriculas m
left join public.pessoas p on p.id = m.pessoa_id
left join public.pessoas rf on rf.id = m.responsavel_financeiro_id
left join encerramento_recente er on er.matricula_id = m.id
left join abertas a on a.matricula_id = m.id
where m.status = 'CANCELADA'
  and m.cancelamento_tipo = 'DESISTENCIA_REAL'
  and coalesce(m.gera_perda_financeira, false) = true
order by coalesce(er.realizado_em, m.encerramento_em, m.data_encerramento) desc nulls last;

-- =========================================================
-- BLOCO 4 - Casos excluidos hoje e qual condicao faltou
-- Inclui a Julia mais recente com cobranca cancelada manualmente
-- =========================================================
with encerramento_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.motivo,
    me.realizado_em,
    me.cobrancas_canceladas_valor_centavos
  from public.matriculas_encerramentos me
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
),
cobrancas_canceladas as (
  select
    c.origem_id as matricula_id,
    bool_or(c.cancelada_em is not null) as possui_cobranca_cancelada,
    bool_or(c.cancelamento_tipo = 'CANCELAMENTO_POR_MATRICULA_CANCELADA') as possui_cancelamento_manual_matricula,
    max(c.cancelada_em) as ultima_cobranca_cancelada_em,
    string_agg(distinct coalesce(c.cancelamento_tipo, coalesce(c.cancelamento_motivo, c.cancelada_motivo), c.status), ' | ') as sinais_cobranca
  from public.cobrancas c
  where c.origem_tipo = 'MATRICULA'
    and c.status = 'CANCELADA'
  group by c.origem_id
)
select
  m.id as matricula_id,
  p.nome as aluno_nome,
  rf.nome as responsavel_financeiro_nome,
  m.cancelamento_tipo,
  m.gera_perda_financeira,
  er.motivo as cancelamento_motivo,
  coalesce(er.realizado_em, m.encerramento_em, m.data_encerramento) as data_cancelamento,
  coalesce(cc.possui_cobranca_cancelada, false) as possui_cobranca_cancelada,
  coalesce(cc.possui_cancelamento_manual_matricula, false) as possui_cancelamento_manual_matricula,
  cc.ultima_cobranca_cancelada_em,
  cc.sinais_cobranca,
  case
    when m.cancelamento_tipo is distinct from 'DESISTENCIA_REAL' then 'faltou cancelamento_tipo = DESISTENCIA_REAL'
    when coalesce(m.gera_perda_financeira, false) = false then 'faltou gera_perda_financeira = true'
    else 'fora por outra condicao da implementacao'
  end as causa_exclusao_atual
from public.matriculas m
left join public.pessoas p on p.id = m.pessoa_id
left join public.pessoas rf on rf.id = m.responsavel_financeiro_id
left join encerramento_recente er on er.matricula_id = m.id
left join cobrancas_canceladas cc on cc.matricula_id = m.id
where m.status = 'CANCELADA'
  and (
    m.cancelamento_tipo is distinct from 'DESISTENCIA_REAL'
    or coalesce(m.gera_perda_financeira, false) = false
  )
order by coalesce(cc.ultima_cobranca_cancelada_em, er.realizado_em, m.encerramento_em, m.data_encerramento) desc nulls last
limit 100;

-- =========================================================
-- BLOCO 5 - Caso especifico da Julia recem-cancelada
-- Usa a Julia com cobranca manual cancelada mais recente
-- =========================================================
with julia_alvo as (
  select
    m.id as matricula_id,
    p.id as aluno_id,
    p.nome as aluno_nome,
    rf.id as responsavel_financeiro_id,
    rf.nome as responsavel_financeiro_nome,
    m.status as status_matricula,
    m.cancelamento_tipo as matricula_cancelamento_tipo,
    m.gera_perda_financeira,
    me.motivo as cancelamento_motivo,
    me.realizado_em as data_cancelamento,
    c.id as cobranca_id,
    c.cancelada_em,
    c.cancelamento_tipo as cobranca_cancelamento_tipo,
    coalesce(c.cancelamento_motivo, c.cancelada_motivo) as cobranca_cancelamento_motivo,
    c.status,
    coalesce(vw.saldo_aberto_centavos, c.valor_centavos) as saldo,
    c.conta_interna_id
  from public.matriculas m
  join public.pessoas p on p.id = m.pessoa_id
  left join public.pessoas rf on rf.id = m.responsavel_financeiro_id
  left join lateral (
    select motivo, realizado_em
    from public.matriculas_encerramentos me
    where me.matricula_id = m.id
    order by me.realizado_em desc nulls last, me.id desc
    limit 1
  ) me on true
  join public.cobrancas c
    on c.origem_tipo = 'MATRICULA'
   and c.origem_id = m.id
   and c.status = 'CANCELADA'
   and c.cancelada_em is not null
  left join public.vw_financeiro_contas_receber_flat vw on vw.cobranca_id = c.id
  where p.nome ilike '%Julia%'
  order by c.cancelada_em desc, c.id desc
  limit 1
)
select
  matricula_id,
  aluno_id,
  aluno_nome,
  responsavel_financeiro_id,
  responsavel_financeiro_nome,
  status_matricula,
  matricula_cancelamento_tipo,
  gera_perda_financeira,
  cancelamento_motivo,
  data_cancelamento,
  cobranca_id,
  cancelada_em,
  cobranca_cancelamento_tipo,
  cobranca_cancelamento_motivo,
  status,
  saldo,
  conta_interna_id,
  case when matricula_cancelamento_tipo = 'DESISTENCIA_REAL' then 'sim' else 'nao' end as atende_regra_a,
  case when cobranca_cancelamento_tipo = 'CANCELAMENTO_POR_MATRICULA_CANCELADA' then 'sim' else 'nao' end as atende_regra_b,
  case
    when upper(coalesce(cancelamento_motivo, '')) like '%DESIST%'
      or upper(coalesce(cancelamento_motivo, '')) like '%ABANDON%'
      or upper(coalesce(cancelamento_motivo, '')) like '%SEM INTERESSE%'
      or upper(coalesce(cancelamento_motivo, '')) like '%DISTANCIA%'
    then 'sim'
    else 'nao'
  end as atende_regra_c
from julia_alvo;

-- =========================================================
-- BLOCO 6 - Comparacao entre um caso que aparece hoje e a Julia
-- =========================================================
with encerramento_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.motivo,
    me.realizado_em
  from public.matriculas_encerramentos me
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
),
caso_visivel as (
  select
    'CASO_VISIVEL_ATUAL' as grupo,
    m.id as matricula_id,
    p.nome as aluno_nome,
    m.cancelamento_tipo,
    m.gera_perda_financeira,
    er.motivo as cancelamento_motivo,
    null::bigint as cobranca_id,
    null::text as cobranca_cancelamento_tipo
  from public.matriculas m
  left join public.pessoas p on p.id = m.pessoa_id
  left join encerramento_recente er on er.matricula_id = m.id
  where m.status = 'CANCELADA'
    and m.cancelamento_tipo = 'DESISTENCIA_REAL'
    and coalesce(m.gera_perda_financeira, false) = true
  order by coalesce(er.realizado_em, m.encerramento_em, m.data_encerramento) desc nulls last
  limit 1
),
julia_alvo as (
  select
    'JULIA_ALVO' as grupo,
    m.id as matricula_id,
    p.nome as aluno_nome,
    m.cancelamento_tipo,
    m.gera_perda_financeira,
    me.motivo as cancelamento_motivo,
    c.id as cobranca_id,
    c.cancelamento_tipo as cobranca_cancelamento_tipo
  from public.matriculas m
  join public.pessoas p on p.id = m.pessoa_id
  left join lateral (
    select motivo, realizado_em
    from public.matriculas_encerramentos me
    where me.matricula_id = m.id
    order by me.realizado_em desc nulls last, me.id desc
    limit 1
  ) me on true
  join public.cobrancas c
    on c.origem_tipo = 'MATRICULA'
   and c.origem_id = m.id
   and c.status = 'CANCELADA'
   and c.cancelada_em is not null
  where p.nome ilike '%Julia%'
  order by c.cancelada_em desc, c.id desc
  limit 1
)
select *
from caso_visivel
union all
select *
from julia_alvo;
