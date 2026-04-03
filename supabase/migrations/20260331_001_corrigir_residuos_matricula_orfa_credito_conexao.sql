begin;

-- ============================================================
-- Corrige residuos financeiros de matriculas canceladas/excluidas
-- que permaneceram no Cartao Conexao e em descontos de folha.
--
-- Regras desta migration:
-- - usa criterio rastreavel por origem, cobranca, competencia e matricula
-- - cancela logicamente cobrancas/lancamentos quando houver historico
-- - remove pivots e reflexos derivados quando o dado for reconstruivel
-- - recalcula faturas afetadas para impedir reincorporacao do residuo
-- ============================================================

-- ------------------------------------------------------------
-- 1) Identificar lancamentos ativos cuja cadeia de origem aponta
--    para matricula cancelada, item cancelado, cobranca cancelada
--    ou orfandade da cadeia.
-- ------------------------------------------------------------
drop table if exists tmp_cc_matricula_orfa_lancamentos;

create temp table tmp_cc_matricula_orfa_lancamentos on commit drop as
with lancamentos_base as (
  select
    l.id as lancamento_id,
    l.cobranca_id,
    l.conta_conexao_id,
    l.competencia,
    l.status as lancamento_status,
    l.origem_sistema,
    l.origem_id,
    l.matricula_id,
    fl.fatura_id,
    c.id as cobranca_encontrada_id,
    c.status as cobranca_status,
    c.cancelada_em as cobranca_cancelada_em,
    coalesce(c.expurgada, false) as cobranca_expurgada,
    c.origem_tipo as cobranca_origem_tipo,
    c.origem_id as cobranca_origem_id,
    c.origem_item_tipo as cobranca_origem_item_tipo,
    c.origem_item_id as cobranca_origem_item_id,
    mi.id as matricula_item_id,
    mi.status as matricula_item_status,
    mi.matricula_id as matricula_item_matricula_id,
    coalesce(
      l.matricula_id,
      case
        when upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' then l.origem_id
        else null
      end,
      case
        when upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA_ITEM' then mi.matricula_id
        else null
      end,
      case
        when upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA' then c.origem_item_id
        else null
      end,
      case
        when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id
        else null
      end
    ) as matricula_id_resolvida
  from public.credito_conexao_lancamentos l
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.lancamento_id = l.id
  left join public.cobrancas c
    on c.id = l.cobranca_id
  left join public.matricula_itens mi
    on mi.id = c.origem_item_id
   and upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA_ITEM'
),
lancamentos_resolvidos as (
  select
    lb.*,
    m.id as matricula_encontrada_id,
    m.status as matricula_status,
    array_remove(
      array[
        case
          when lb.cobranca_id is not null and lb.cobranca_encontrada_id is null then 'cobranca_ausente'
          else null
        end,
        case
          when lb.cobranca_encontrada_id is not null
           and (
             lb.cobranca_cancelada_em is not null
             or lb.cobranca_expurgada
             or upper(coalesce(lb.cobranca_status, '')) in ('CANCELADA', 'CANCELADO')
           ) then 'cobranca_cancelada_ou_expurgada'
          else null
        end,
        case
          when upper(coalesce(lb.cobranca_origem_item_tipo, '')) = 'MATRICULA_ITEM'
           and lb.matricula_item_id is null then 'matricula_item_ausente'
          else null
        end,
        case
          when lb.matricula_item_id is not null
           and upper(coalesce(lb.matricula_item_status, '')) = 'CANCELADO' then 'matricula_item_cancelado'
          else null
        end,
        case
          when lb.matricula_id_resolvida is not null
           and m.id is null then 'matricula_ausente'
          else null
        end,
        case
          when m.id is not null
           and upper(coalesce(m.status::text, '')) = 'CANCELADA' then 'matricula_cancelada'
          else null
        end
      ],
      null
    ) as motivos
  from lancamentos_base lb
  left join public.matriculas m
    on m.id = lb.matricula_id_resolvida
)
select
  lancamento_id,
  cobranca_id,
  conta_conexao_id,
  competencia,
  fatura_id,
  matricula_id_resolvida as matricula_id,
  array_to_string(motivos, ' | ') as motivo
from lancamentos_resolvidos
where upper(coalesce(lancamento_status, '')) in ('PENDENTE_FATURA', 'FATURADO')
  and cardinality(motivos) > 0;

comment on table tmp_cc_matricula_orfa_lancamentos is
  'Lancamentos ativos do Cartao Conexao com cadeia de origem cancelada ou orfa.';

-- ------------------------------------------------------------
-- 2) Desvincular os lancamentos orfaos das faturas e cancelar
--    logicamente o lancamento derivado para que ele nao reapareca
--    em rebuild futuro.
-- ------------------------------------------------------------
delete from public.credito_conexao_fatura_lancamentos fl
where fl.lancamento_id in (
  select t.lancamento_id
  from tmp_cc_matricula_orfa_lancamentos t
);

update public.credito_conexao_lancamentos l
   set status = 'CANCELADO',
       composicao_json = coalesce(l.composicao_json, '{}'::jsonb) || jsonb_build_object(
         'correcao_matricula_orfa_20260331',
         jsonb_build_object(
           'motivo', coalesce(t.motivo, 'cadeia_financeira_invalida'),
           'corrigido_em', now()
         )
       ),
       updated_at = now()
  from tmp_cc_matricula_orfa_lancamentos t
 where l.id = t.lancamento_id;

-- ------------------------------------------------------------
-- 3) Identificar cobrancas abertas ligadas a matriculas canceladas,
--    itens cancelados ou aos proprios lancamentos orfaos detectados.
--    Aqui o historico e preservado via cancelamento logico.
-- ------------------------------------------------------------
drop table if exists tmp_cc_matricula_orfa_cobrancas;

create temp table tmp_cc_matricula_orfa_cobrancas on commit drop as
with cobrancas_base as (
  select
    c.id as cobranca_id,
    c.valor_centavos,
    c.competencia_ano_mes as competencia,
    c.status as cobranca_status,
    c.cancelada_em as cobranca_cancelada_em,
    coalesce(c.expurgada, false) as cobranca_expurgada,
    c.origem_tipo,
    c.origem_id,
    c.origem_item_tipo,
    c.origem_item_id,
    mi.id as matricula_item_id,
    mi.status as matricula_item_status,
    mi.matricula_id as matricula_item_matricula_id,
    coalesce(
      case
        when upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA' then c.origem_item_id
        else null
      end,
      case
        when upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA_ITEM' then mi.matricula_id
        else null
      end,
      case
        when upper(coalesce(c.origem_tipo, '')) like 'MATRICULA%' then c.origem_id
        else null
      end
    ) as matricula_id_resolvida
  from public.cobrancas c
  left join public.matricula_itens mi
    on mi.id = c.origem_item_id
   and upper(coalesce(c.origem_item_tipo, '')) = 'MATRICULA_ITEM'
),
cobrancas_resolvidas as (
  select
    cb.*,
    m.id as matricula_encontrada_id,
    m.status as matricula_status,
    array_remove(
      array[
        case
          when cb.cobranca_id in (
            select distinct t.cobranca_id
            from tmp_cc_matricula_orfa_lancamentos t
            where t.cobranca_id is not null
          ) then 'cobranca_vinculada_a_lancamento_orfao'
          else null
        end,
        case
          when upper(coalesce(cb.origem_item_tipo, '')) = 'MATRICULA_ITEM'
           and cb.matricula_item_id is null then 'matricula_item_ausente'
          else null
        end,
        case
          when cb.matricula_item_id is not null
           and upper(coalesce(cb.matricula_item_status, '')) = 'CANCELADO' then 'matricula_item_cancelado'
          else null
        end,
        case
          when cb.matricula_id_resolvida is not null
           and m.id is null then 'matricula_ausente'
          else null
        end,
        case
          when m.id is not null
           and upper(coalesce(m.status::text, '')) = 'CANCELADA' then 'matricula_cancelada'
          else null
        end
      ],
      null
    ) as motivos
  from cobrancas_base cb
  left join public.matriculas m
    on m.id = cb.matricula_id_resolvida
)
select
  cobranca_id,
  valor_centavos,
  competencia,
  array_to_string(motivos, ' | ') as motivo
from cobrancas_resolvidas
where upper(coalesce(cobranca_status, '')) not in (
    'PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA',
    'CANCELADA', 'CANCELADO'
  )
  and not cobranca_expurgada
  and cardinality(motivos) > 0;

update public.cobrancas c
   set status = 'CANCELADA',
       cancelada_em = coalesce(c.cancelada_em, now()),
       cancelada_motivo = coalesce(c.cancelada_motivo, 'Correcao 2026-03-31: matricula cancelada/orfa no Cartao Conexao'),
       updated_at = now()
  from tmp_cc_matricula_orfa_cobrancas t
 where c.id = t.cobranca_id;

-- ------------------------------------------------------------
-- 4) Rebuild das faturas afetadas para recalcular pivots e totais
--    sem reincorporar os lancamentos residuais.
--    Quando a funcao oficial existir, ela e priorizada.
-- ------------------------------------------------------------
drop table if exists tmp_cc_faturas_afetadas;

create temp table tmp_cc_faturas_afetadas on commit drop as
select distinct
  f.id as fatura_id,
  f.conta_conexao_id,
  f.periodo_referencia as competencia
from public.credito_conexao_faturas f
where f.id in (
  select distinct t.fatura_id
  from tmp_cc_matricula_orfa_lancamentos t
  where t.fatura_id is not null
);

do $$
declare
  r record;
begin
  if to_regprocedure('public.fn_credito_conexao_rebuild_fatura_por_competencia(bigint,text)') is not null then
    for r in
      select distinct conta_conexao_id, competencia
      from tmp_cc_faturas_afetadas
      where conta_conexao_id is not null
        and competencia is not null
    loop
      perform public.fn_credito_conexao_rebuild_fatura_por_competencia(r.conta_conexao_id, r.competencia);
    end loop;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) Ajuste final do total e do status da fatura afetada.
--    Fatura zerada e cancelada logicamente e deixa de apontar para
--    a folha; fatura com saldo remanescente mantem total recalculado.
-- ------------------------------------------------------------
with totais as (
  select
    f.id as fatura_id,
    coalesce(sum(
      case
        when upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO') then l.valor_centavos
        else 0
      end
    ), 0)::integer as total_centavos
  from public.credito_conexao_faturas f
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.fatura_id = f.id
  left join public.credito_conexao_lancamentos l
    on l.id = fl.lancamento_id
  where f.id in (select fatura_id from tmp_cc_faturas_afetadas)
  group by f.id
)
update public.credito_conexao_faturas f
   set valor_total_centavos = t.total_centavos,
       status = case
         when t.total_centavos <= 0 then 'CANCELADA'
         when f.data_vencimento is not null and f.data_vencimento < current_date then 'EM_ATRASO'
         else 'ABERTA'
       end,
       folha_pagamento_id = case
         when t.total_centavos <= 0 then null
         else f.folha_pagamento_id
       end,
       updated_at = now()
  from totais t
 where f.id = t.fatura_id;

-- ------------------------------------------------------------
-- 6) Limpar o reflexo em folha quando a fatura ficou zerada ou
--    cancelada. Esse dado e derivado e pode ser reconstruido.
-- ------------------------------------------------------------
delete from public.folha_pagamento_itens i
where i.referencia_tipo = 'CREDITO_CONEXAO_FATURA'
  and i.referencia_id in (
    select f.id
    from public.credito_conexao_faturas f
    where f.id in (select fatura_id from tmp_cc_faturas_afetadas)
      and (
        upper(coalesce(f.status, '')) = 'CANCELADA'
        or coalesce(f.valor_total_centavos, 0) <= 0
      )
  );

delete from public.folha_pagamento_eventos e
where e.origem_tipo = 'CREDITO_CONEXAO_FATURA'
  and e.origem_id in (
    select f.id
    from public.credito_conexao_faturas f
    where f.id in (select fatura_id from tmp_cc_faturas_afetadas)
      and (
        upper(coalesce(f.status, '')) = 'CANCELADA'
        or coalesce(f.valor_total_centavos, 0) <= 0
      )
  );

-- ------------------------------------------------------------
-- 7) Para faturas ainda validas apos o rebuild, manter a folha em
--    sincronia atualizando o valor residual legitimo remanescente.
-- ------------------------------------------------------------
update public.folha_pagamento_itens i
   set valor_centavos = f.valor_total_centavos,
       descricao = 'Desconto Cartao Conexao (fatura #' || f.id || ')'
  from public.credito_conexao_faturas f
 where i.referencia_tipo = 'CREDITO_CONEXAO_FATURA'
   and i.referencia_id = f.id
   and f.id in (select fatura_id from tmp_cc_faturas_afetadas)
   and upper(coalesce(f.status, '')) <> 'CANCELADA'
   and coalesce(f.valor_total_centavos, 0) > 0;

update public.folha_pagamento_eventos e
   set valor_centavos = f.valor_total_centavos,
       descricao = 'Cartao Conexao - Fatura ' || f.id,
       updated_at = now()
  from public.credito_conexao_faturas f
 where e.origem_tipo = 'CREDITO_CONEXAO_FATURA'
   and e.origem_id = f.id
   and f.id in (select fatura_id from tmp_cc_faturas_afetadas)
   and upper(coalesce(f.status, '')) <> 'CANCELADA'
   and coalesce(f.valor_total_centavos, 0) > 0;

commit;
