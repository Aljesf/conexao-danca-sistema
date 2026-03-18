-- Diagnostico seguro da separacao correta entre:
-- - agrupador da conta interna (intermediacao financeira)
-- - lancamento da conta interna (destino real: escola, cafe, loja)
-- - cobranca derivada
--
-- Este arquivo NAO executa update.

with colunas_monitoradas as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'credito_conexao_lancamentos' and column_name in ('centro_custo_id', 'matricula_id', 'cobranca_id'))
      or (table_name = 'matriculas' and column_name in ('cancelamento_tipo', 'gera_perda_financeira', 'encerramento_em'))
      or (table_name = 'cobrancas' and column_name in ('centro_custo_id', 'conta_interna_id'))
      or (
        table_name = 'credito_conexao_contas'
        and column_name in ('centro_custo_intermediacao_id', 'centro_custo_principal_id', 'responsavel_financeiro_pessoa_id')
      )
    )
)
select
  current_database() as ambiente_atual,
  table_name,
  column_name
from colunas_monitoradas
order by table_name, column_name;

with centros_base as (
  select
    max(case when ecf.id = 1 then ecf.centro_custo_padrao_escola_id end) as centro_escola_config_id,
    max(case when ecf.id = 1 then ecf.centro_custo_intermediacao_financeira_id end) as centro_intermediacao_config_id
  from public.escola_config_financeira ecf
),
centros_resolvidos as (
  select
    coalesce(
      max(cb.centro_escola_config_id),
      max(case when upper(cc.codigo) = 'ESCOLA' then cc.id end)
    ) as centro_escola_id,
    max(case when upper(cc.codigo) = 'CAFE' then cc.id end) as centro_cafe_id,
    max(case when upper(cc.codigo) = 'LOJA' then cc.id end) as centro_loja_id,
    coalesce(
      max(cb.centro_intermediacao_config_id),
      max(case when upper(cc.codigo) = 'FIN' then cc.id end),
      max(case when upper(cc.nome) like '%INTERMEDIACAO%' then cc.id end)
    ) as centro_intermediacao_id
  from centros_base cb
  cross join public.centros_custo cc
)
select *
from centros_resolvidos;

-- 1) Lancamentos sem centro de custo definido
with lancamentos_enriquecidos as (
  select
    l.id as lancamento_id,
    l.conta_conexao_id as conta_interna_id,
    l.origem_sistema,
    l.origem_id,
    l.descricao,
    l.cobranca_id,
    l.matricula_id,
    nullif(to_jsonb(l) ->> 'centro_custo_id', '')::bigint as centro_custo_lancamento_id
  from public.credito_conexao_lancamentos l
)
select
  lancamento_id,
  conta_interna_id,
  origem_sistema,
  origem_id,
  descricao,
  cobranca_id,
  matricula_id
from lancamentos_enriquecidos
where centro_custo_lancamento_id is null
order by lancamento_id desc;

-- 2) Lancamentos com centro de custo diferente do esperado pelo tipo real
with centros_resolvidos as (
  select
    coalesce(
      max(case when ecf.id = 1 then ecf.centro_custo_padrao_escola_id end),
      max(case when upper(cc.codigo) = 'ESCOLA' then cc.id end)
    ) as centro_escola_id,
    max(case when upper(cc.codigo) = 'CAFE' then cc.id end) as centro_cafe_id,
    max(case when upper(cc.codigo) = 'LOJA' then cc.id end) as centro_loja_id
  from public.centros_custo cc
  left join public.escola_config_financeira ecf on ecf.id = 1
),
lancamentos_enriquecidos as (
  select
    l.id as lancamento_id,
    l.conta_conexao_id as conta_interna_id,
    l.origem_sistema,
    l.origem_id,
    l.descricao,
    l.cobranca_id,
    l.matricula_id,
    nullif(to_jsonb(l) ->> 'centro_custo_id', '')::bigint as centro_custo_lancamento_id,
    case
      when upper(coalesce(l.origem_sistema, '')) in ('MATRICULA', 'MATRICULA_REPROCESSAR', 'MATRICULA_MENSAL', 'MENSALIDADE')
        then (select centro_escola_id from centros_resolvidos)
      when upper(coalesce(l.origem_sistema, '')) = 'CAFE'
        then (select centro_cafe_id from centros_resolvidos)
      when upper(coalesce(l.origem_sistema, '')) in ('LOJA', 'LOJA_VENDA')
        then (select centro_loja_id from centros_resolvidos)
      else null
    end as centro_custo_esperado_id
  from public.credito_conexao_lancamentos l
)
select
  le.lancamento_id,
  le.conta_interna_id,
  le.origem_sistema,
  le.origem_id,
  le.descricao,
  le.cobranca_id,
  le.matricula_id,
  le.centro_custo_lancamento_id,
  atual.codigo as centro_custo_lancamento_codigo,
  atual.nome as centro_custo_lancamento_nome,
  le.centro_custo_esperado_id,
  esperado.codigo as centro_custo_esperado_codigo,
  esperado.nome as centro_custo_esperado_nome
from lancamentos_enriquecidos le
left join public.centros_custo atual on atual.id = le.centro_custo_lancamento_id
left join public.centros_custo esperado on esperado.id = le.centro_custo_esperado_id
where le.centro_custo_esperado_id is not null
  and coalesce(le.centro_custo_lancamento_id, -1) <> le.centro_custo_esperado_id
order by le.lancamento_id desc;

-- 3) Cobrancas cujo centro de custo nao bate com o lancamento principal
with lancamentos_enriquecidos as (
  select
    l.id as lancamento_id,
    l.cobranca_id,
    nullif(to_jsonb(l) ->> 'centro_custo_id', '')::bigint as centro_custo_lancamento_id
  from public.credito_conexao_lancamentos l
  where l.cobranca_id is not null
),
cobrancas_lancamento_unico as (
  select
    le.cobranca_id,
    min(le.centro_custo_lancamento_id) as centro_custo_lancamento_id,
    count(distinct le.centro_custo_lancamento_id) as qtd_centros_distintos,
    count(*) as qtd_lancamentos
  from lancamentos_enriquecidos le
  where le.centro_custo_lancamento_id is not null
  group by le.cobranca_id
)
select
  c.id as cobranca_id,
  c.descricao,
  c.origem_tipo,
  c.origem_id,
  c.conta_interna_id,
  c.centro_custo_id as centro_custo_cobranca_id,
  cc_cobranca.codigo as centro_custo_cobranca_codigo,
  cc_cobranca.nome as centro_custo_cobranca_nome,
  clu.centro_custo_lancamento_id,
  cc_lancamento.codigo as centro_custo_lancamento_codigo,
  cc_lancamento.nome as centro_custo_lancamento_nome,
  clu.qtd_lancamentos
from public.cobrancas c
join cobrancas_lancamento_unico clu
  on clu.cobranca_id = c.id
left join public.centros_custo cc_cobranca on cc_cobranca.id = c.centro_custo_id
left join public.centros_custo cc_lancamento on cc_lancamento.id = clu.centro_custo_lancamento_id
where clu.qtd_centros_distintos = 1
  and coalesce(c.centro_custo_id, -1) <> clu.centro_custo_lancamento_id
order by c.id desc;

-- 4) Contas internas cujo agrupador nao aponta para intermedicao financeira
with centros_base as (
  select
    max(case when ecf.id = 1 then ecf.centro_custo_intermediacao_financeira_id end) as centro_intermediacao_config_id
  from public.escola_config_financeira ecf
),
centro_intermediacao as (
  select
    coalesce(
      max(cb.centro_intermediacao_config_id),
      max(case when upper(cc.codigo) = 'FIN' then cc.id end),
      max(case when upper(cc.nome) like '%INTERMEDIACAO%' then cc.id end)
    ) as centro_intermediacao_id
  from centros_base cb
  cross join public.centros_custo cc
)
select
  conta.id as conta_interna_id,
  conta.pessoa_titular_id,
  conta.responsavel_financeiro_pessoa_id,
  conta.tipo_conta,
  conta.descricao_exibicao,
  conta.centro_custo_intermediacao_id,
  cc_intermediacao.codigo as centro_intermediacao_codigo,
  cc_intermediacao.nome as centro_intermediacao_nome,
  conta.centro_custo_principal_id,
  cc_principal.codigo as centro_principal_codigo,
  cc_principal.nome as centro_principal_nome
from public.credito_conexao_contas conta
left join public.centros_custo cc_intermediacao on cc_intermediacao.id = conta.centro_custo_intermediacao_id
left join public.centros_custo cc_principal on cc_principal.id = conta.centro_custo_principal_id
where coalesce(conta.centro_custo_intermediacao_id, -1) <>
  coalesce((select centro_intermediacao_id from centro_intermediacao), -1)
order by conta.id desc;

-- 5) Matriculas canceladas com saldo aberto
with abertas as (
  select
    c.id as cobranca_id,
    c.origem_id as matricula_id,
    c.pessoa_id,
    c.valor_centavos,
    coalesce(v.saldo_aberto_centavos, c.valor_centavos) as saldo_aberto_centavos,
    c.status,
    c.vencimento,
    c.conta_interna_id
  from public.cobrancas c
  left join public.vw_financeiro_contas_receber_flat v
    on v.cobranca_id = c.id
  where upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
    and upper(coalesce(c.status, '')) not in ('CANCELADA', 'QUITADA')
    and coalesce(v.saldo_aberto_centavos, c.valor_centavos, 0) > 0
),
encerramento_mais_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.tipo,
    me.motivo,
    me.realizado_em
  from public.matriculas_encerramentos me
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
)
select
  m.id as matricula_id,
  m.pessoa_id as aluno_id,
  m.responsavel_financeiro_id as responsavel_id,
  a.conta_interna_id,
  a.cobranca_id,
  a.valor_centavos,
  a.saldo_aberto_centavos,
  a.status as status_cobranca,
  a.vencimento,
  coalesce(nullif(to_jsonb(m) ->> 'cancelamento_tipo', ''), emr.tipo) as cancelamento_tipo,
  coalesce(nullif(to_jsonb(m) ->> 'gera_perda_financeira', '')::boolean, false) as gera_perda_financeira,
  emr.motivo as motivo_cancelamento
from public.matriculas m
join abertas a on a.matricula_id = m.id
left join encerramento_mais_recente emr on emr.matricula_id = m.id
where m.status = 'CANCELADA'
order by a.saldo_aberto_centavos desc, m.id desc;

-- 6) Caso especifico matricula #7
with lancamentos_matricula as (
  select
    l.id as lancamento_id,
    l.conta_conexao_id as conta_interna_id,
    l.cobranca_id,
    l.matricula_id,
    l.aluno_id,
    nullif(to_jsonb(l) ->> 'centro_custo_id', '')::bigint as centro_custo_lancamento_id
  from public.credito_conexao_lancamentos l
  where l.matricula_id = 7
     or (upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' and l.origem_id = 7)
),
encerramento_mais_recente as (
  select distinct on (me.matricula_id)
    me.matricula_id,
    me.tipo,
    me.motivo,
    me.realizado_em
  from public.matriculas_encerramentos me
  where me.matricula_id = 7
  order by me.matricula_id, me.realizado_em desc nulls last, me.id desc
)
select
  m.id as matricula_id,
  m.pessoa_id as aluno_id,
  m.responsavel_financeiro_id as responsavel_id,
  coalesce(c.conta_interna_id, lm.conta_interna_id) as conta_interna_id,
  c.id as cobranca_id,
  lm.lancamento_id,
  cc_lancamento.nome as centro_custo_lancamento,
  cc_cobranca.nome as centro_custo_cobranca,
  coalesce(nullif(to_jsonb(m) ->> 'cancelamento_tipo', ''), emr.tipo) as cancelamento_tipo,
  coalesce(nullif(to_jsonb(m) ->> 'gera_perda_financeira', '')::boolean, false) as gera_perda_financeira,
  emr.motivo as motivo_cancelamento
from public.matriculas m
left join public.cobrancas c
  on upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
 and c.origem_id = m.id
left join lancamentos_matricula lm
  on lm.cobranca_id = c.id
left join public.centros_custo cc_lancamento on cc_lancamento.id = lm.centro_custo_lancamento_id
left join public.centros_custo cc_cobranca on cc_cobranca.id = c.centro_custo_id
left join encerramento_mais_recente emr on emr.matricula_id = m.id
where m.id = 7
order by c.id nulls last, lm.lancamento_id nulls last;
