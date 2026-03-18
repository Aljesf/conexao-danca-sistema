-- Backfill manual e nao destrutivo para migracao semantica de cobrancas.
-- Revisar antes de executar em ambiente real.
--
-- Garantias:
-- - nao recria cobrancas;
-- - nao cancela cobrancas;
-- - nao altera valores, vencimentos, saldo ou recebimentos;
-- - nao remove vinculos legados;
-- - marca como AMBIGUO quando nao houver prova suficiente.

-- ============================================================================
-- BLOCO A - Cobrancas canonicas de fatura do Cartao Conexao
-- ============================================================================
begin;

with alvo as (
  select
    c.id as cobranca_id,
    coalesce(f.conta_conexao_id, f_origem.conta_conexao_id) as conta_interna_id,
    'CONTA_INTERNA'::text as origem_agrupador_tipo,
    coalesce(f.conta_conexao_id, f_origem.conta_conexao_id)::bigint as origem_agrupador_id,
    'OUTRO'::text as origem_item_tipo,
    null::bigint as origem_item_id,
    'Conta interna do aluno'::text as origem_label,
    'MIGRADO'::text as migracao_conta_interna_status,
    null::text as migracao_conta_interna_observacao
  from public.cobrancas c
  left join public.credito_conexao_faturas f
    on f.cobranca_id = c.id
  left join public.credito_conexao_faturas f_origem
    on upper(coalesce(c.origem_tipo, '')) in ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
   and f_origem.id = c.origem_id
  where coalesce(c.status, '') <> 'CANCELADA'
    and coalesce(f.id, f_origem.id) is not null
    and coalesce(f.conta_conexao_id, f_origem.conta_conexao_id) is not null
    and coalesce(c.migracao_conta_interna_status, '') <> 'MIGRADO'
),
before_state as (
  select
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_anterior
  from public.cobrancas c
  join alvo a
    on a.cobranca_id = c.id
),
updated as (
  update public.cobrancas c
     set origem_agrupador_tipo = a.origem_agrupador_tipo,
         origem_agrupador_id = a.origem_agrupador_id,
         origem_item_tipo = a.origem_item_tipo,
         origem_item_id = a.origem_item_id,
         conta_interna_id = a.conta_interna_id,
         origem_label = a.origem_label,
         migracao_conta_interna_status = a.migracao_conta_interna_status,
         migracao_conta_interna_observacao = a.migracao_conta_interna_observacao
    from alvo a
   where c.id = a.cobranca_id
  returning
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_nova
)
insert into public.auditoria_migracao_conta_interna_cobrancas (
  cobranca_id,
  etapa,
  classificacao_anterior,
  classificacao_nova,
  observacao
)
select
  u.cobranca_id,
  'BLOCO_A_FATURA',
  b.classificacao_anterior,
  u.classificacao_nova,
  'Cobranca canonica de fatura classificada sob conta interna comprovada pela propria fatura.'
from updated u
join before_state b
  on b.cobranca_id = u.cobranca_id;

commit;

-- ============================================================================
-- BLOCO B - Cobrancas legadas de matricula elegiveis ao Cartao Conexao
-- ============================================================================
begin;

with contas_titular_unicas as (
  select
    cc.pessoa_titular_id,
    count(*) filter (
      where coalesce(cc.ativo, true)
        and upper(coalesce(cc.tipo_conta, '')) = 'ALUNO'
    ) as qtd_contas,
    min(cc.id) filter (
      where coalesce(cc.ativo, true)
        and upper(coalesce(cc.tipo_conta, '')) = 'ALUNO'
    ) as conta_interna_id
  from public.credito_conexao_contas cc
  where cc.pessoa_titular_id is not null
  group by cc.pessoa_titular_id
),
alvo as (
  select
    c.id as cobranca_id,
    coalesce(
      l.conta_conexao_id,
      case when conta_resp.qtd_contas = 1 then conta_resp.conta_interna_id end,
      case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_interna_id end
    ) as conta_interna_id,
    'CONTA_INTERNA'::text as origem_agrupador_tipo,
    coalesce(
      l.conta_conexao_id,
      case when conta_resp.qtd_contas = 1 then conta_resp.conta_interna_id end,
      case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_interna_id end
    )::bigint as origem_agrupador_id,
    'MATRICULA'::text as origem_item_tipo,
    c.origem_id::bigint as origem_item_id,
    'Matricula - conta interna do aluno'::text as origem_label,
    'MIGRADO'::text as migracao_conta_interna_status,
    null::text as migracao_conta_interna_observacao
  from public.cobrancas c
  join public.matriculas m
    on m.id = c.origem_id
  left join public.credito_conexao_lancamentos l
    on l.cobranca_id = c.id
  left join contas_titular_unicas conta_resp
    on conta_resp.pessoa_titular_id = m.responsavel_financeiro_id
  left join contas_titular_unicas conta_aluno
    on conta_aluno.pessoa_titular_id = m.pessoa_id
  where coalesce(c.status, '') <> 'CANCELADA'
    and upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
    and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
    and coalesce(
      l.conta_conexao_id,
      case when conta_resp.qtd_contas = 1 then conta_resp.conta_interna_id end,
      case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_interna_id end
    ) is not null
    and coalesce(c.migracao_conta_interna_status, '') <> 'MIGRADO'
),
before_state as (
  select
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_anterior
  from public.cobrancas c
  join alvo a
    on a.cobranca_id = c.id
),
updated as (
  update public.cobrancas c
     set origem_agrupador_tipo = a.origem_agrupador_tipo,
         origem_agrupador_id = a.origem_agrupador_id,
         origem_item_tipo = a.origem_item_tipo,
         origem_item_id = a.origem_item_id,
         conta_interna_id = a.conta_interna_id,
         origem_label = a.origem_label,
         migracao_conta_interna_status = a.migracao_conta_interna_status,
         migracao_conta_interna_observacao = a.migracao_conta_interna_observacao
    from alvo a
   where c.id = a.cobranca_id
  returning
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_nova
)
insert into public.auditoria_migracao_conta_interna_cobrancas (
  cobranca_id,
  etapa,
  classificacao_anterior,
  classificacao_nova,
  observacao
)
select
  u.cobranca_id,
  'BLOCO_B_MATRICULA',
  b.classificacao_anterior,
  u.classificacao_nova,
  'Cobranca legada de matricula migrada para agrupador CONTA_INTERNA com item MATRICULA.'
from updated u
join before_state b
  on b.cobranca_id = u.cobranca_id;

commit;

-- ============================================================================
-- BLOCO C - Cobrancas diretas que nao devem migrar para conta interna
-- ============================================================================
begin;

with alvo as (
  select
    c.id as cobranca_id,
    case
      when upper(coalesce(c.origem_tipo, '')) = 'AJUSTE' then 'AJUSTE'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then 'AJUSTE'
      else 'VENDA_DIRETA'
    end as origem_agrupador_tipo,
    null::bigint as origem_agrupador_id,
    case
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then 'PRO_RATA'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA') then 'LOJA'
      when upper(coalesce(c.origem_tipo, '')) = 'CAFE' then 'CAFE'
      when upper(coalesce(c.origem_tipo, '')) = 'AJUSTE' then 'AJUSTE'
      else 'OUTRO'
    end as origem_item_tipo,
    c.origem_id::bigint as origem_item_id,
    null::bigint as conta_interna_id,
    case
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then 'Entrada / Pro-rata'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA') then 'Cobranca direta - Loja'
      when upper(coalesce(c.origem_tipo, '')) = 'CAFE' then 'Cobranca direta - Cafe'
      when upper(coalesce(c.origem_tipo, '')) = 'AJUSTE' then 'Ajuste direto'
      else 'Cobranca direta'
    end as origem_label,
    'MANTER_DIRETO'::text as migracao_conta_interna_status,
    null::text as migracao_conta_interna_observacao
  from public.cobrancas c
  where coalesce(c.status, '') <> 'CANCELADA'
    and (
      (
        upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
        and (
          upper(coalesce(c.descricao, '')) like '%PRO-RATA%'
          or upper(coalesce(c.descricao, '')) like '%PRO RATA%'
          or upper(coalesce(c.descricao, '')) like '%ENTRADA%'
        )
      )
      or (
        upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA')
        and upper(coalesce(c.origem_subtipo, '')) not like '%CONEXAO%'
      )
      or (
        upper(coalesce(c.origem_tipo, '')) = 'CAFE'
        and upper(coalesce(c.origem_subtipo, '')) not like '%CONEXAO%'
        and upper(coalesce(c.origem_subtipo, '')) not like '%CONTA_INTERNA%'
      )
      or upper(coalesce(c.origem_tipo, '')) = 'AJUSTE'
    )
    and coalesce(c.migracao_conta_interna_status, '') not in ('MIGRADO', 'MANTER_DIRETO')
),
before_state as (
  select
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_anterior
  from public.cobrancas c
  join alvo a
    on a.cobranca_id = c.id
),
updated as (
  update public.cobrancas c
     set origem_agrupador_tipo = a.origem_agrupador_tipo,
         origem_agrupador_id = a.origem_agrupador_id,
         origem_item_tipo = a.origem_item_tipo,
         origem_item_id = a.origem_item_id,
         conta_interna_id = a.conta_interna_id,
         origem_label = a.origem_label,
         migracao_conta_interna_status = a.migracao_conta_interna_status,
         migracao_conta_interna_observacao = a.migracao_conta_interna_observacao
    from alvo a
   where c.id = a.cobranca_id
  returning
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_nova
)
insert into public.auditoria_migracao_conta_interna_cobrancas (
  cobranca_id,
  etapa,
  classificacao_anterior,
  classificacao_nova,
  observacao
)
select
  u.cobranca_id,
  'BLOCO_C_MANTER_DIRETO',
  b.classificacao_anterior,
  u.classificacao_nova,
  'Cobranca direta mantida fora da conta interna para preservar a semantica original.'
from updated u
join before_state b
  on b.cobranca_id = u.cobranca_id;

commit;

-- ============================================================================
-- BLOCO D - Casos ambiguos
-- ============================================================================
begin;

with contas_titular_unicas as (
  select
    cc.pessoa_titular_id,
    count(*) filter (
      where coalesce(cc.ativo, true)
        and upper(coalesce(cc.tipo_conta, '')) = 'ALUNO'
    ) as qtd_contas
  from public.credito_conexao_contas cc
  where cc.pessoa_titular_id is not null
  group by cc.pessoa_titular_id
),
alvo as (
  select
    c.id as cobranca_id,
    'AMBIGUO'::text as migracao_conta_interna_status,
    case
      when upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(conta_resp.qtd_contas, 0) = 0
       and coalesce(conta_aluno.qtd_contas, 0) = 0
        then 'Matricula elegivel ao Cartao Conexao sem conta interna ALUNO ativa para aluno ou responsavel.'
      when upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and (
         coalesce(conta_resp.qtd_contas, 0) > 1
         or coalesce(conta_aluno.qtd_contas, 0) > 1
       )
        then 'Matricula com mais de uma conta interna candidata; exige saneamento manual antes do backfill.'
      when coalesce(nullif(btrim(c.descricao), ''), '') = ''
        then 'Descricao legada vazia; origem humana precisa de saneamento manual.'
      else 'Relacao financeira nao comprovada com seguranca pela trilha atual.'
    end as migracao_conta_interna_observacao
  from public.cobrancas c
  left join public.matriculas m
    on upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
   and m.id = c.origem_id
  left join contas_titular_unicas conta_resp
    on conta_resp.pessoa_titular_id = m.responsavel_financeiro_id
  left join contas_titular_unicas conta_aluno
    on conta_aluno.pessoa_titular_id = m.pessoa_id
  where coalesce(c.status, '') <> 'CANCELADA'
    and coalesce(c.migracao_conta_interna_status, '') not in ('MIGRADO', 'MANTER_DIRETO', 'IGNORAR')
    and (
      (
        upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
        and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
        and coalesce(conta_resp.qtd_contas, 0) <> 1
        and coalesce(conta_aluno.qtd_contas, 0) <> 1
      )
      or (
        upper(coalesce(c.origem_tipo, '')) in ('MATRICULA', 'MATRICULA_MENSALIDADE')
        and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
        and (
          coalesce(conta_resp.qtd_contas, 0) > 1
          or coalesce(conta_aluno.qtd_contas, 0) > 1
        )
      )
      or coalesce(nullif(btrim(c.descricao), ''), '') = ''
    )
),
before_state as (
  select
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_anterior
  from public.cobrancas c
  join alvo a
    on a.cobranca_id = c.id
),
updated as (
  update public.cobrancas c
     set migracao_conta_interna_status = a.migracao_conta_interna_status,
         migracao_conta_interna_observacao = a.migracao_conta_interna_observacao
    from alvo a
   where c.id = a.cobranca_id
  returning
    c.id as cobranca_id,
    jsonb_build_object(
      'origem_agrupador_tipo', c.origem_agrupador_tipo,
      'origem_agrupador_id', c.origem_agrupador_id,
      'origem_item_tipo', c.origem_item_tipo,
      'origem_item_id', c.origem_item_id,
      'conta_interna_id', c.conta_interna_id,
      'origem_label', c.origem_label,
      'migracao_conta_interna_status', c.migracao_conta_interna_status,
      'migracao_conta_interna_observacao', c.migracao_conta_interna_observacao
    ) as classificacao_nova
)
insert into public.auditoria_migracao_conta_interna_cobrancas (
  cobranca_id,
  etapa,
  classificacao_anterior,
  classificacao_nova,
  observacao
)
select
  u.cobranca_id,
  'BLOCO_D_AMBIGUO',
  b.classificacao_anterior,
  u.classificacao_nova,
  'Caso marcado como ambiguo para impedir inferencia incorreta de conta interna.'
from updated u
join before_state b
  on b.cobranca_id = u.cobranca_id;

commit;

-- ============================================================================
-- BLOCO E - SELECTs finais de conferencia
-- ============================================================================
select
  coalesce(migracao_conta_interna_status, 'SEM_STATUS') as migracao_conta_interna_status,
  count(*) as quantidade,
  sum(coalesce(valor_centavos, 0)) as total_valor_centavos
from public.cobrancas
where coalesce(status, '') <> 'CANCELADA'
group by coalesce(migracao_conta_interna_status, 'SEM_STATUS')
order by migracao_conta_interna_status;

select
  id as cobranca_id,
  pessoa_id,
  descricao,
  origem_tipo,
  origem_subtipo,
  origem_agrupador_tipo,
  origem_agrupador_id,
  origem_item_tipo,
  origem_item_id,
  conta_interna_id,
  origem_label,
  migracao_conta_interna_status,
  migracao_conta_interna_observacao,
  valor_centavos,
  vencimento,
  status
from public.cobrancas
where coalesce(status, '') <> 'CANCELADA'
  and coalesce(migracao_conta_interna_status, '') in ('MIGRADO', 'MANTER_DIRETO', 'AMBIGUO')
order by id desc;

select
  id,
  cobranca_id,
  etapa,
  classificacao_anterior,
  classificacao_nova,
  observacao,
  created_at
from public.auditoria_migracao_conta_interna_cobrancas
order by id desc;
