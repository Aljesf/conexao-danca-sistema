-- Dashboard Escola - detalhamento operacional de alunos
-- Esta view apoia o dashboard da Escola com drill-down operacional por aluno.
-- Serve para modais e listagens sintéticas de pagantes e concessoes.
-- Nao substitui relatorios completos, consultas analiticas ou visoes financeiras oficiais.
--
-- Regra de classificacao:
-- 1) Usa somente o modelo canonico atual: pessoas + matriculas + turma_aluno + turmas.
-- 2) Concessao e detectada por absorcao institucional na execucao da matricula por turma
--    e/ou por concessao ativa (bolsa_concessoes/bolsa_tipos).
-- 3) Quando a granularidade permitir, concessao_tipo sai como INTEGRAL ou PARCIAL.
-- 4) Casos de concessao sem granularidade segura permanecem com concessao_tipo = NULL.

begin;

create or replace view public.vw_escola_dashboard_alunos_detalhe as
with turmas_base as (
  select
    t.turma_id,
    t.nome as turma_nome,
    t.curso,
    t.nivel,
    t.turno,
    t.ano_referencia,
    t.status
  from public.turmas t
  where coalesce(t.ativo, true) = true
    and coalesce(upper(t.status), 'ATIVA') not in ('ENCERRADA', 'CANCELADA')
),
vinculos_ativos as (
  select distinct on (ta.turma_id, ta.aluno_pessoa_id)
    ta.turma_aluno_id,
    ta.turma_id,
    ta.aluno_pessoa_id,
    ta.matricula_id,
    ta.nivel_id
  from public.turma_aluno ta
  join turmas_base tb
    on tb.turma_id = ta.turma_id
  where coalesce(lower(ta.status), 'ativo') = 'ativo'
    and coalesce(ta.dt_inicio, current_date) <= current_date
    and (ta.dt_fim is null or ta.dt_fim >= current_date)
  order by
    ta.turma_id,
    ta.aluno_pessoa_id,
    coalesce(ta.dt_inicio, current_date) desc,
    ta.turma_aluno_id desc
),
vinculos_canonicos as (
  select
    va.turma_aluno_id,
    va.turma_id,
    va.aluno_pessoa_id,
    va.nivel_id,
    matricula.id as matricula_id,
    matricula.metodo_liquidacao,
    matricula.total_mensalidade_centavos
  from vinculos_ativos va
  left join lateral (
    select
      m.id,
      m.metodo_liquidacao,
      m.total_mensalidade_centavos
    from public.matriculas m
    where (
      va.matricula_id is not null
      and m.id = va.matricula_id
    ) or (
      va.matricula_id is null
      and m.pessoa_id = va.aluno_pessoa_id
      and m.vinculo_id = va.turma_id
    )
    order by
      case
        when va.matricula_id is not null and m.id = va.matricula_id then 0
        else 1
      end,
      case
        when upper(coalesce(m.status::text, '')) in ('ATIVA', 'ATIVO', 'CONCLUIDA') then 0
        else 1
      end,
      coalesce(m.updated_at, m.created_at) desc,
      m.id desc
    limit 1
  ) matricula on true
),
execucoes_por_vinculo as (
  select
    mev.matricula_id,
    mev.turma_id,
    sum(coalesce(mev.valor_mensal_centavos, 0))::bigint as valor_total_execucao_centavos,
    sum(
      case
        when upper(coalesce(mev.origem_valor, '')) like 'MANUAL|FAMILIA%'
          then coalesce(mev.valor_mensal_centavos, 0)
        else 0
      end
    )::bigint as valor_familia_identificado_centavos,
    sum(
      case
        when upper(coalesce(mev.origem_valor, '')) like 'MANUAL|BOLSA%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL|MOVIMENTO%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL_MOVIMENTO%'
          then coalesce(mev.valor_mensal_centavos, 0)
        else 0
      end
    )::bigint as valor_institucional_identificado_centavos,
    sum(
      case
        when upper(coalesce(mev.origem_valor, '')) like 'MANUAL|FAMILIA%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL|BOLSA%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL|MOVIMENTO%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL_MOVIMENTO%'
          then 0
        else coalesce(mev.valor_mensal_centavos, 0)
      end
    )::bigint as valor_generico_centavos
  from public.matricula_execucao_valores mev
  where coalesce(mev.ativo, true) = true
  group by
    mev.matricula_id,
    mev.turma_id
),
bolsas_ativas_por_vinculo as (
  select
    vc.turma_aluno_id,
    bool_or(bt.modo = 'INTEGRAL') as tem_concessao_integral,
    bool_or(bt.modo in ('PERCENTUAL', 'VALOR_FINAL_FAMILIA')) as tem_concessao_parcial,
    count(bc.id)::int as concessoes_ativas
  from vinculos_canonicos vc
  join public.bolsa_concessoes bc
    on bc.pessoa_id = vc.aluno_pessoa_id
   and (bc.matricula_id is null or bc.matricula_id = vc.matricula_id)
   and (bc.turma_id is null or bc.turma_id = vc.turma_id)
   and upper(coalesce(bc.status, 'ATIVA')) = 'ATIVA'
   and bc.data_inicio <= current_date
   and (bc.data_fim is null or bc.data_fim >= current_date)
  join public.bolsa_tipos bt
    on bt.id = bc.bolsa_tipo_id
  group by
    vc.turma_aluno_id
),
vinculos_classificados as (
  select
    vc.turma_aluno_id,
    vc.turma_id,
    vc.aluno_pessoa_id,
    vc.matricula_id,
    case
      when e.valor_total_execucao_centavos is not null then
        coalesce(e.valor_familia_identificado_centavos, 0)
        + case
            when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then 0
            else coalesce(e.valor_generico_centavos, 0)
          end
      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then 0
      else coalesce(vc.total_mensalidade_centavos, 0)
    end::bigint as valor_familia_centavos,
    case
      when e.valor_total_execucao_centavos is not null then
        coalesce(e.valor_institucional_identificado_centavos, 0)
        + case
            when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
              then coalesce(e.valor_generico_centavos, 0)
            else 0
          end
      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
        then coalesce(vc.total_mensalidade_centavos, 0)
      else 0
    end::bigint as valor_institucional_centavos,
    case
      when vc.matricula_id is null then null
      when (
        (
          case
            when e.valor_total_execucao_centavos is not null then
              coalesce(e.valor_institucional_identificado_centavos, 0)
              + case
                  when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                    then coalesce(e.valor_generico_centavos, 0)
                  else 0
                end
            when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
              then coalesce(vc.total_mensalidade_centavos, 0)
            else 0
          end
        ) > 0
        or coalesce(ba.concessoes_ativas, 0) > 0
      ) then 'CONCESSAO'
      else 'PAGANTE'
    end as classificacao_institucional,
    case
      when vc.matricula_id is null then null
      when (
        (
          case
            when e.valor_total_execucao_centavos is not null then
              coalesce(e.valor_institucional_identificado_centavos, 0)
              + case
                  when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                    then coalesce(e.valor_generico_centavos, 0)
                  else 0
                end
            when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
              then coalesce(vc.total_mensalidade_centavos, 0)
            else 0
          end
        ) > 0
        or coalesce(ba.concessoes_ativas, 0) > 0
      ) then
        case
          when (
            (
              case
                when e.valor_total_execucao_centavos is not null then
                  coalesce(e.valor_institucional_identificado_centavos, 0)
                  + case
                      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                        then coalesce(e.valor_generico_centavos, 0)
                      else 0
                    end
                when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                  then coalesce(vc.total_mensalidade_centavos, 0)
                else 0
              end
            ) > 0
            and (
              case
                when e.valor_total_execucao_centavos is not null then
                  coalesce(e.valor_familia_identificado_centavos, 0)
                  + case
                      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                        then 0
                      else coalesce(e.valor_generico_centavos, 0)
                    end
                when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then 0
                else coalesce(vc.total_mensalidade_centavos, 0)
              end
            ) > 0
          ) or coalesce(ba.tem_concessao_parcial, false) then 'PARCIAL'
          when (
            (
              case
                when e.valor_total_execucao_centavos is not null then
                  coalesce(e.valor_institucional_identificado_centavos, 0)
                  + case
                      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                        then coalesce(e.valor_generico_centavos, 0)
                      else 0
                    end
                when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                  then coalesce(vc.total_mensalidade_centavos, 0)
                else 0
              end
            ) > 0
            and (
              case
                when e.valor_total_execucao_centavos is not null then
                  coalesce(e.valor_familia_identificado_centavos, 0)
                  + case
                      when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
                        then 0
                      else coalesce(e.valor_generico_centavos, 0)
                    end
                when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then 0
                else coalesce(vc.total_mensalidade_centavos, 0)
              end
            ) = 0
          ) or coalesce(ba.tem_concessao_integral, false) then 'INTEGRAL'
          else null
        end
      else null
    end as concessao_tipo
  from vinculos_canonicos vc
  left join execucoes_por_vinculo e
    on e.matricula_id = vc.matricula_id
   and e.turma_id = vc.turma_id
  left join bolsas_ativas_por_vinculo ba
    on ba.turma_aluno_id = vc.turma_aluno_id
)
select
  p.id as pessoa_id,
  p.nome as aluno_nome,
  p.nascimento as data_nascimento,
  case
    when p.nascimento is not null then extract(year from age(current_date, p.nascimento))::int
    else null
  end as idade_anos,
  tb.turma_id,
  tb.turma_nome,
  tb.curso,
  vc.classificacao_institucional,
  vc.concessao_tipo,
  lower(btrim(p.nome)) as ordem_alfabetica_nome
from vinculos_classificados vc
join public.pessoas p
  on p.id = vc.aluno_pessoa_id
join turmas_base tb
  on tb.turma_id = vc.turma_id
where vc.classificacao_institucional in ('PAGANTE', 'CONCESSAO');

comment on view public.vw_escola_dashboard_alunos_detalhe is
'View canonica de apoio ao dashboard da Escola para drill-down operacional por aluno. Usa apenas pessoas, matriculas, turma_aluno e turmas; nao substitui relatorios completos.';

commit;
