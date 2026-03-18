-- Diagnostico da migracao semantica de cobrancas para conta interna.
-- O script nao altera dados. A unica estrutura criada eh uma view temporaria
-- em pg_temp para reutilizar a mesma base nas consultas de auditoria.

drop view if exists pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna;

create temporary view pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna as
with recebimentos_confirmados as (
  select
    r.cobranca_id,
    coalesce(
      sum(
        case
          when r.data_pagamento is not null then coalesce(r.valor_centavos, 0)
          else 0
        end
      ),
      0
    )::bigint as total_pago_centavos
  from public.recebimentos r
  where r.cobranca_id is not null
  group by r.cobranca_id
),
lancamentos_ranked as (
  select
    l.*,
    row_number() over (
      partition by l.cobranca_id
      order by l.id desc
    ) as rn
  from public.credito_conexao_lancamentos l
  where l.cobranca_id is not null
),
faturas_diretas_ranked as (
  select
    f.*,
    row_number() over (
      partition by f.cobranca_id
      order by f.id desc
    ) as rn
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
),
faturas_origem_ranked as (
  select
    c.id as cobranca_id,
    f.id as fatura_id,
    f.conta_conexao_id,
    f.periodo_referencia,
    f.data_vencimento,
    f.status as fatura_status,
    row_number() over (
      partition by c.id
      order by f.id desc
    ) as rn
  from public.cobrancas c
  join public.credito_conexao_faturas f
    on upper(coalesce(c.origem_tipo, '')) in ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
   and f.id = c.origem_id
),
contas_titular_unicas as (
  select
    cc.pessoa_titular_id,
    count(*) filter (
      where coalesce(cc.ativo, true)
        and upper(coalesce(cc.tipo_conta, '')) = 'ALUNO'
    ) as qtd_contas,
    min(cc.id) filter (
      where coalesce(cc.ativo, true)
        and upper(coalesce(cc.tipo_conta, '')) = 'ALUNO'
    ) as conta_conexao_id
  from public.credito_conexao_contas cc
  where cc.pessoa_titular_id is not null
  group by cc.pessoa_titular_id
),
base as (
  select
    c.id as cobranca_id,
    c.pessoa_id,
    devedor.nome as pessoa_nome_cobranca,
    aluno.id as aluno_id,
    aluno.nome as aluno_nome,
    responsavel.id as responsavel_financeiro_id,
    responsavel.nome as responsavel_financeiro_nome,
    c.descricao,
    c.origem_tipo,
    c.origem_subtipo,
    coalesce(
      nullif(btrim(c.competencia_ano_mes), ''),
      nullif(btrim(l.competencia), ''),
      nullif(btrim(fd.periodo_referencia), ''),
      nullif(btrim(fo.periodo_referencia), ''),
      to_char(c.vencimento, 'YYYY-MM')
    ) as competencia_ano_mes,
    case
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id
      when upper(coalesce(l.origem_sistema, '')) = 'MATRICULA' then l.origem_id
      else null
    end as matricula_id,
    l.id as credito_conexao_lancamento_id,
    coalesce(fd.id, fo.fatura_id) as credito_conexao_fatura_id,
    coalesce(
      fd.conta_conexao_id,
      fo.conta_conexao_id,
      l.conta_conexao_id,
      case when conta_resp.qtd_contas = 1 then conta_resp.conta_conexao_id end,
      case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_conexao_id end
    ) as conta_conexao_id,
    c.valor_centavos::bigint as valor_original_centavos,
    greatest(
      coalesce(c.valor_centavos, 0)::bigint - coalesce(rec.total_pago_centavos, 0),
      0
    ) as saldo_atual_centavos,
    c.status,
    c.vencimento,
    case
      when coalesce(fd.id, fo.fatura_id) is not null then 'FATURA_CREDITO_CONEXAO'
      when l.id is not null then 'LANCAMENTO_CREDITO_CONEXAO'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO' then 'MATRICULA_CARTAO_CONEXAO'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and (
         upper(coalesce(c.descricao, '')) like '%PRO-RATA%'
         or upper(coalesce(c.descricao, '')) like '%PRO RATA%'
         or upper(coalesce(c.descricao, '')) like '%ENTRADA%'
       ) then 'MATRICULA_ENTRADA_DIRETA'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA')
       and upper(coalesce(c.origem_subtipo, '')) like '%CONEXAO%' then 'LOJA_CARTAO_CONEXAO'
      when upper(coalesce(c.origem_tipo, '')) = 'CAFE'
       and (
         upper(coalesce(c.origem_subtipo, '')) like '%CONEXAO%'
         or upper(coalesce(c.origem_subtipo, '')) like '%CONTA_INTERNA%'
       ) then 'CAFE_CONTA_INTERNA'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA') then 'LOJA_DIRETA'
      when upper(coalesce(c.origem_tipo, '')) = 'CAFE' then 'CAFE_DIRETO'
      when upper(coalesce(c.origem_tipo, '')) = 'AJUSTE' then 'AJUSTE_DIRETO'
      else 'LEGADO_SEM_CLASSIFICACAO'
    end as classificacao_atual,
    case
      when coalesce(fd.id, fo.fatura_id) is not null
       and coalesce(fd.conta_conexao_id, fo.conta_conexao_id) is not null then 'CONTA_INTERNA_FATURA'
      when coalesce(fd.id, fo.fatura_id) is not null then 'FATURA_SEM_CONTA_INTERNA'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(
         fd.conta_conexao_id,
         fo.conta_conexao_id,
         l.conta_conexao_id,
         case when conta_resp.qtd_contas = 1 then conta_resp.conta_conexao_id end,
         case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_conexao_id end
       ) is not null then 'CONTA_INTERNA_MATRICULA'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO' then 'AMBIGUO_SEM_CONTA_INTERNA'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and (
         upper(coalesce(c.descricao, '')) like '%PRO-RATA%'
         or upper(coalesce(c.descricao, '')) like '%PRO RATA%'
         or upper(coalesce(c.descricao, '')) like '%ENTRADA%'
       ) then 'MANTER_DIRETO_PRO_RATA'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA')
       and upper(coalesce(c.origem_subtipo, '')) not like '%CONEXAO%' then 'MANTER_DIRETO_LOJA'
      when upper(coalesce(c.origem_tipo, '')) = 'CAFE'
       and upper(coalesce(c.origem_subtipo, '')) not like '%CONEXAO%'
       and upper(coalesce(c.origem_subtipo, '')) not like '%CONTA_INTERNA%' then 'MANTER_DIRETO_CAFE'
      when upper(coalesce(c.origem_tipo, '')) = 'AJUSTE' then 'MANTER_DIRETO_AJUSTE'
      when l.id is not null and l.conta_conexao_id is not null then 'CONTA_INTERNA_LANCAMENTO'
      else 'AMBIGUO'
    end as classificacao_sugerida,
    case
      when coalesce(fd.id, fo.fatura_id) is not null then true
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(
         fd.conta_conexao_id,
         fo.conta_conexao_id,
         l.conta_conexao_id,
         case when conta_resp.qtd_contas = 1 then conta_resp.conta_conexao_id end,
         case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_conexao_id end
       ) is not null then true
      when l.id is not null and l.conta_conexao_id is not null then true
      else false
    end as precisa_migracao,
    case
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(
         fd.conta_conexao_id,
         fo.conta_conexao_id,
         l.conta_conexao_id,
         case when conta_resp.qtd_contas = 1 then conta_resp.conta_conexao_id end,
         case when conta_aluno.qtd_contas = 1 then conta_aluno.conta_conexao_id end
       ) is null
        then 'Matricula elegivel ao Cartao Conexao sem conta interna comprovada por cobranca, fatura, lancamento ou titular unico.'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(conta_resp.qtd_contas, 0) > 1
        then 'Responsavel financeiro possui mais de uma conta interna ALUNO ativa; exige saneamento manual.'
      when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
       and upper(coalesce(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
       and coalesce(conta_resp.qtd_contas, 0) = 0
       and coalesce(conta_aluno.qtd_contas, 0) > 1
        then 'Aluno possui mais de uma conta interna ALUNO ativa; exige saneamento manual.'
      when coalesce(fd.id, fo.fatura_id) is not null
       and coalesce(fd.conta_conexao_id, fo.conta_conexao_id) is null
        then 'Cobranca de fatura encontrada sem conta interna resolvida na propria fatura.'
      when upper(coalesce(c.origem_tipo, '')) in ('LOJA', 'LOJA_VENDA', 'CAFE')
       and upper(coalesce(c.origem_subtipo, '')) like '%CONEXAO%'
       and coalesce(fd.conta_conexao_id, fo.conta_conexao_id, l.conta_conexao_id) is null
        then 'Origem elegivel a conta interna sem rastreabilidade suficiente no vinculo atual.'
      when coalesce(nullif(btrim(c.descricao), ''), '') = ''
        then 'Descricao vazia; fallback visual depende apenas da origem tecnica.'
      else null
    end as risco_semantico
  from public.cobrancas c
  left join public.pessoas devedor
    on devedor.id = c.pessoa_id
  left join public.matriculas m
    on upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
   and m.id = c.origem_id
  left join public.pessoas aluno
    on aluno.id = m.pessoa_id
  left join public.pessoas responsavel
    on responsavel.id = m.responsavel_financeiro_id
  left join recebimentos_confirmados rec
    on rec.cobranca_id = c.id
  left join lancamentos_ranked l
    on l.cobranca_id = c.id
   and l.rn = 1
  left join faturas_diretas_ranked fd
    on fd.cobranca_id = c.id
   and fd.rn = 1
  left join faturas_origem_ranked fo
    on fo.cobranca_id = c.id
   and fo.rn = 1
  left join contas_titular_unicas conta_resp
    on conta_resp.pessoa_titular_id = m.responsavel_financeiro_id
  left join contas_titular_unicas conta_aluno
    on conta_aluno.pessoa_titular_id = m.pessoa_id
  where coalesce(c.status, '') <> 'CANCELADA'
    and greatest(
      coalesce(c.valor_centavos, 0)::bigint - coalesce(rec.total_pago_centavos, 0),
      0
    ) > 0
    and (
      c.vencimento < current_date
      or upper(coalesce(c.status, '')) in ('PENDENTE', 'ABERTA', 'EM_ATRASO', 'ERRO_INTEGRACAO')
    )
    and (
      upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%'
      or upper(coalesce(c.origem_tipo, '')) in ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA', 'CAFE', 'LOJA', 'LOJA_VENDA', 'AJUSTE')
      or l.id is not null
      or fd.id is not null
      or fo.fatura_id is not null
    )
)
select *
from base;

-- 1) Resumo por classificacao atual x classificacao sugerida
select
  classificacao_atual,
  classificacao_sugerida,
  count(*) as quantidade_cobrancas,
  sum(valor_original_centavos) as total_original_centavos,
  sum(saldo_atual_centavos) as total_saldo_atual_centavos,
  count(*) filter (where conta_conexao_id is null) as quantidade_sem_conta_interna
from pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna
group by classificacao_atual, classificacao_sugerida
order by classificacao_sugerida, classificacao_atual;

-- 2) Auditoria detalhada
select
  cobranca_id,
  pessoa_id,
  pessoa_nome_cobranca,
  aluno_id,
  aluno_nome,
  responsavel_financeiro_id,
  responsavel_financeiro_nome,
  descricao,
  origem_tipo,
  origem_subtipo,
  competencia_ano_mes,
  matricula_id,
  credito_conexao_lancamento_id,
  credito_conexao_fatura_id,
  conta_conexao_id,
  valor_original_centavos,
  saldo_atual_centavos,
  status,
  vencimento,
  classificacao_atual,
  classificacao_sugerida,
  precisa_migracao,
  risco_semantico
from pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna
order by
  case
    when classificacao_sugerida like 'AMBIGUO%' then 0
    when classificacao_sugerida = 'FATURA_SEM_CONTA_INTERNA' then 1
    when precisa_migracao then 2
    else 3
  end,
  vencimento asc,
  cobranca_id asc;

-- 3) Casos "MATRICULA #x" sem conta interna associada
select
  cobranca_id,
  pessoa_id,
  aluno_id,
  responsavel_financeiro_id,
  descricao,
  competencia_ano_mes,
  matricula_id,
  valor_original_centavos,
  saldo_atual_centavos,
  status,
  vencimento,
  classificacao_atual,
  classificacao_sugerida,
  risco_semantico
from pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna
where upper(coalesce(origem_tipo, '')) like 'MATRICULA%'
  and upper(coalesce(origem_subtipo, '')) = 'CARTAO_CONEXAO'
  and conta_conexao_id is null
order by vencimento asc, cobranca_id asc;

-- 4) Casos com conta interna existente, mas UI ainda exibindo matricula
select
  cobranca_id,
  pessoa_id,
  aluno_id,
  responsavel_financeiro_id,
  descricao,
  competencia_ano_mes,
  matricula_id,
  credito_conexao_lancamento_id,
  credito_conexao_fatura_id,
  conta_conexao_id,
  valor_original_centavos,
  saldo_atual_centavos,
  status,
  vencimento,
  classificacao_atual,
  classificacao_sugerida
from pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna
where upper(coalesce(origem_tipo, '')) like 'MATRICULA%'
  and conta_conexao_id is not null
order by competencia_ano_mes asc nulls last, cobranca_id asc;

-- 5) Cobrancas diretas que devem continuar fora da conta interna
select
  cobranca_id,
  pessoa_id,
  descricao,
  origem_tipo,
  origem_subtipo,
  competencia_ano_mes,
  matricula_id,
  valor_original_centavos,
  saldo_atual_centavos,
  status,
  vencimento,
  classificacao_atual,
  classificacao_sugerida,
  risco_semantico
from pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna
where classificacao_sugerida in (
  'MANTER_DIRETO_PRO_RATA',
  'MANTER_DIRETO_LOJA',
  'MANTER_DIRETO_CAFE',
  'MANTER_DIRETO_AJUSTE'
)
order by vencimento asc, cobranca_id asc;

drop view if exists pg_temp.vw_diagnostico_migracao_cobrancas_conta_interna;
