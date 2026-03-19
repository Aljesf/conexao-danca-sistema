-- Auditoria diagnostica da apuracao do bloco "Resultado por centro de custo".
-- Nao altera schema. Use para validar heranca de centro entre recebimentos,
-- cobrancas, faturas/lancamentos de credito conexao e movimento financeiro.

with janela as (
  select
    current_date::date as data_base,
    (current_date - interval '29 day')::date as inicio_atual,
    current_date::date as fim_atual,
    (current_date - interval '59 day')::date as inicio_anterior,
    (current_date - interval '30 day')::date as fim_anterior
),
centros as (
  select id, codigo, nome
  from centros_custo
  where ativo = true
),
receitas_confirmadas as (
  select
    r.id as recebimento_id,
    r.cobranca_id,
    r.valor_centavos,
    r.data_pagamento::date as data_operacional,
    r.centro_custo_id as centro_recebimento_id,
    c.centro_custo_id as centro_cobranca_id,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.descricao as cobranca_descricao,
    c.neofin_charge_id,
    l_dir.id as lancamento_direto_id,
    l_dir.centro_custo_id as centro_lancamento_direto_id,
    l_dir.conta_conexao_id as conta_conexao_direta_id,
    f.id as fatura_id,
    l_fat.id as lancamento_fatura_id,
    l_fat.centro_custo_id as centro_lancamento_fatura_id,
    l_fat.conta_conexao_id as conta_conexao_fatura_id
  from recebimentos r
  left join cobrancas c on c.id = r.cobranca_id
  left join credito_conexao_lancamentos l_dir on l_dir.cobranca_id = c.id
  left join credito_conexao_faturas f
    on f.cobranca_id = c.id
    or (
      c.origem_tipo in ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
      and f.id = c.origem_id
    )
  left join credito_conexao_fatura_lancamentos fl on fl.fatura_id = f.id
  left join credito_conexao_lancamentos l_fat on l_fat.id = fl.lancamento_id
  cross join janela j
  where r.data_pagamento::date between j.inicio_atual and j.fim_atual
),
receitas_resolvidas as (
  select
    rc.*,
    coalesce(
      rc.centro_recebimento_id,
      rc.centro_cobranca_id,
      rc.centro_lancamento_direto_id,
      rc.centro_lancamento_fatura_id
    ) as centro_resolvido_id
  from receitas_confirmadas rc
),
movimentos_receita as (
  select
    m.id,
    m.origem,
    m.origem_id,
    m.centro_custo_id,
    m.valor_centavos,
    m.data_movimento::date as data_operacional
  from movimento_financeiro m
  cross join janela j
  where m.data_movimento::date between j.inicio_atual and j.fim_atual
    and upper(m.tipo) in ('ENTRADA', 'RECEITA')
),
movimentos_despesa as (
  select
    m.id,
    m.origem,
    m.origem_id,
    m.centro_custo_id,
    m.valor_centavos,
    m.data_movimento::date as data_operacional
  from movimento_financeiro m
  cross join janela j
  where m.data_movimento::date between j.inicio_atual and j.fim_atual
    and upper(m.tipo) in ('SAIDA', 'DESPESA')
),
despesas_confirmadas as (
  select
    p.id as pagamento_id,
    p.conta_pagar_id,
    p.data_pagamento::date as data_operacional,
    p.centro_custo_id as centro_pagamento_id,
    cp.centro_custo_id as centro_conta_id,
    p.valor_principal_centavos + coalesce(p.juros_centavos, 0) - coalesce(p.desconto_centavos, 0) as valor_centavos
  from contas_pagar_pagamentos p
  left join contas_pagar cp on cp.id = p.conta_pagar_id
  cross join janela j
  where p.data_pagamento::date between j.inicio_atual and j.fim_atual
),
receitas_confirmadas_por_centro as (
  select
    rr.centro_resolvido_id as centro_custo_id,
    sum(rr.valor_centavos) as receitas_confirmadas_centavos,
    count(distinct rr.recebimento_id) as qtd_recebimentos
  from receitas_resolvidas rr
  group by rr.centro_resolvido_id
),
movimentos_receita_por_centro as (
  select
    mr.centro_custo_id,
    sum(mr.valor_centavos) as movimento_financeiro_receita_centavos
  from movimentos_receita mr
  group by mr.centro_custo_id
),
despesas_confirmadas_por_centro as (
  select
    coalesce(dc.centro_pagamento_id, dc.centro_conta_id) as centro_custo_id,
    sum(dc.valor_centavos) as despesas_confirmadas_centavos,
    count(distinct dc.pagamento_id) as qtd_pagamentos
  from despesas_confirmadas dc
  group by coalesce(dc.centro_pagamento_id, dc.centro_conta_id)
),
movimentos_despesa_por_centro as (
  select
    md.centro_custo_id,
    sum(md.valor_centavos) as movimento_financeiro_despesa_centavos
  from movimentos_despesa md
  group by md.centro_custo_id
)

-- 1) Comparacao de receitas confirmadas por centro resolvido vs movimento financeiro.
select
  'receitas_confirmadas_vs_movimento' as bloco,
  coalesce(cc.nome, concat('Centro ', coalesce(rc.centro_custo_id, mrc.centro_custo_id)::text), 'Sem centro') as centro_custo,
  coalesce(rc.receitas_confirmadas_centavos, 0) as receitas_confirmadas_centavos,
  coalesce(rc.qtd_recebimentos, 0) as qtd_recebimentos,
  coalesce(mrc.movimento_financeiro_receita_centavos, 0) as movimento_financeiro_receita_centavos
from receitas_confirmadas_por_centro rc
full join movimentos_receita_por_centro mrc on mrc.centro_custo_id is not distinct from rc.centro_custo_id
left join centros cc on cc.id = coalesce(rc.centro_custo_id, mrc.centro_custo_id)
order by 2;

-- 2) Recebimentos sem centro no recebimento/cobranca, mas recuperaveis via lancamento/fatura.
select
  rr.recebimento_id,
  rr.cobranca_id,
  rr.cobranca_descricao,
  rr.origem_tipo,
  rr.origem_subtipo,
  rr.valor_centavos,
  rr.centro_recebimento_id,
  rr.centro_cobranca_id,
  rr.centro_lancamento_direto_id,
  rr.centro_lancamento_fatura_id,
  rr.centro_resolvido_id,
  cc.nome as centro_resolvido_nome
from receitas_resolvidas rr
left join centros cc on cc.id = rr.centro_resolvido_id
where rr.centro_recebimento_id is null
  and rr.centro_cobranca_id is null
  and rr.centro_resolvido_id is not null
order by rr.data_operacional desc, rr.recebimento_id desc;

-- 3) Recebimentos ainda sem centro resolvido na janela atual.
select
  rr.recebimento_id,
  rr.cobranca_id,
  rr.cobranca_descricao,
  rr.origem_tipo,
  rr.origem_subtipo,
  rr.valor_centavos,
  rr.neofin_charge_id,
  rr.centro_recebimento_id,
  rr.centro_cobranca_id,
  rr.centro_lancamento_direto_id,
  rr.centro_lancamento_fatura_id
from receitas_resolvidas rr
where rr.centro_resolvido_id is null
order by rr.data_operacional desc, rr.recebimento_id desc;

-- 4) Despesas confirmadas por centro resolvido vs movimento financeiro.
select
  'despesas_confirmadas_vs_movimento' as bloco,
  coalesce(cc.nome, concat('Centro ', coalesce(dc.centro_custo_id, mdc.centro_custo_id)::text), 'Sem centro') as centro_custo,
  coalesce(dc.despesas_confirmadas_centavos, 0) as despesas_confirmadas_centavos,
  coalesce(dc.qtd_pagamentos, 0) as qtd_pagamentos,
  coalesce(mdc.movimento_financeiro_despesa_centavos, 0) as movimento_financeiro_despesa_centavos
from despesas_confirmadas_por_centro dc
full join movimentos_despesa_por_centro mdc on mdc.centro_custo_id is not distinct from dc.centro_custo_id
left join centros cc on cc.id = coalesce(dc.centro_custo_id, mdc.centro_custo_id)
order by 2;
