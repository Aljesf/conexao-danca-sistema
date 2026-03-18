-- Dashboard Escola - composicao SaaS de turmas
-- Esta view apoia o dashboard operacional SaaS da Escola.
-- A composicao por turma e um resumo executivo/operacional e nao substitui relatorios analiticos detalhados.

begin;

create or replace view public.vw_escola_dashboard_turmas_composicao as
with turmas_base as (
  select
    t.turma_id,
    t.nome,
    t.tipo_turma,
    t.ano_referencia,
    t.status,
    t.curso,
    t.nivel,
    t.turno,
    t.capacidade,
    coalesce(professor_atual.professor_nome, professor_fallback.professor_nome) as professor_nome
  from public.turmas t
  left join lateral (
    select pp.nome as professor_nome
    from public.turma_professores tp
    join public.colaboradores c
      on c.id = tp.colaborador_id
    join public.pessoas pp
      on pp.id = c.pessoa_id
    where tp.turma_id = t.turma_id
      and coalesce(tp.ativo, true) = true
      and coalesce(tp.data_inicio, current_date) <= current_date
      and (tp.data_fim is null or tp.data_fim >= current_date)
    order by
      tp.principal desc,
      tp.data_inicio desc,
      tp.id desc
    limit 1
  ) professor_atual on true
  left join lateral (
    select pp.nome as professor_nome
    from public.colaboradores c
    join public.pessoas pp
      on pp.id = c.pessoa_id
    where c.id = t.professor_id
    limit 1
  ) professor_fallback on true
  where coalesce(t.ativo, true) = true
    and coalesce(upper(t.status), 'ATIVA') not in ('ENCERRADA', 'CANCELADA')
),
vinculos_ativos as (
  select distinct on (ta.turma_id, ta.aluno_pessoa_id)
    ta.turma_aluno_id,
    ta.turma_id,
    ta.aluno_pessoa_id,
    ta.matricula_id,
    ta.nivel_id,
    ta.dt_inicio,
    ta.dt_fim
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
    max(nullif(btrim(mev.nivel), '')) as nivel_execucao,
    sum(
      case
        when upper(coalesce(mev.origem_valor, '')) like 'MANUAL|FAMILIA%'
          then coalesce(mev.valor_mensal_centavos, 0)
        else 0
      end
    )::int as valor_familia_centavos,
    sum(
      case
        when upper(coalesce(mev.origem_valor, '')) like 'MANUAL|BOLSA%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL|MOVIMENTO%'
          or upper(coalesce(mev.origem_valor, '')) like 'MANUAL_MOVIMENTO%'
          then coalesce(mev.valor_mensal_centavos, 0)
        else 0
      end
    )::int as valor_institucional_centavos
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
    coalesce(n.nome, e.nivel_execucao, tb.nivel, 'Nao informado') as nivel_composicao,
    coalesce(
      e.valor_familia_centavos,
      case
        when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then 0
        else coalesce(vc.total_mensalidade_centavos, 0)
      end,
      0
    )::int as valor_familia_centavos,
    coalesce(
      e.valor_institucional_centavos,
      case
        when upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA' then coalesce(vc.total_mensalidade_centavos, 0)
        else 0
      end,
      0
    )::int as valor_institucional_centavos,
    case
      when vc.matricula_id is null then 'OUTRO'
      when (
        coalesce(e.valor_institucional_centavos, 0) > 0
        or coalesce(ba.concessoes_ativas, 0) > 0
        or upper(coalesce(vc.metodo_liquidacao, '')) = 'CREDITO_BOLSA'
      ) then
        case
          when (
            coalesce(e.valor_institucional_centavos, 0) > 0
            and coalesce(e.valor_familia_centavos, 0) > 0
          ) or coalesce(ba.tem_concessao_parcial, false) then 'CONCESSAO_PARCIAL'
          when (
            coalesce(e.valor_institucional_centavos, 0) > 0
            and coalesce(e.valor_familia_centavos, 0) = 0
          ) or coalesce(ba.tem_concessao_integral, false) then 'CONCESSAO_INTEGRAL'
          else 'CONCESSAO'
        end
      when vc.matricula_id is not null then 'PAGANTE'
      else 'OUTRO'
    end as vinculo_institucional
  from vinculos_canonicos vc
  join turmas_base tb
    on tb.turma_id = vc.turma_id
  left join execucoes_por_vinculo e
    on e.matricula_id = vc.matricula_id
   and e.turma_id = vc.turma_id
  left join public.niveis n
    on n.id = vc.nivel_id
  left join bolsas_ativas_por_vinculo ba
    on ba.turma_aluno_id = vc.turma_aluno_id
),
agregados_por_turma as (
  select
    tb.turma_id,
    count(vc.turma_aluno_id)::int as alunos_ativos_total,
    count(*) filter (where vc.vinculo_institucional = 'PAGANTE')::int as pagantes_total,
    count(*) filter (
      where vc.vinculo_institucional in ('CONCESSAO', 'CONCESSAO_INTEGRAL', 'CONCESSAO_PARCIAL')
    )::int as concessao_total,
    count(*) filter (where vc.vinculo_institucional = 'CONCESSAO_INTEGRAL')::int as concessao_integral_total,
    count(*) filter (where vc.vinculo_institucional = 'CONCESSAO_PARCIAL')::int as concessao_parcial_total,
    count(*) filter (where vc.vinculo_institucional = 'OUTRO')::int as outros_vinculos_total
  from turmas_base tb
  left join vinculos_classificados vc
    on vc.turma_id = tb.turma_id
  group by
    tb.turma_id
),
distribuicao_niveis as (
  select
    base.turma_id,
    jsonb_agg(
      jsonb_build_object(
        'nivel', base.nivel_composicao,
        'total', base.total
      )
      order by base.total desc, base.nivel_composicao asc
    ) as distribuicao_niveis_json
  from (
    select
      vc.turma_id,
      vc.nivel_composicao,
      count(*)::int as total
    from vinculos_classificados vc
    group by
      vc.turma_id,
      vc.nivel_composicao
  ) base
  group by
    base.turma_id
)
select
  tb.turma_id,
  tb.nome,
  tb.tipo_turma,
  tb.ano_referencia,
  tb.status,
  tb.curso,
  tb.nivel,
  tb.turno,
  tb.capacidade,
  tb.professor_nome,
  coalesce(ag.alunos_ativos_total, 0) as alunos_ativos_total,
  case
    when tb.capacidade is not null then greatest(tb.capacidade - coalesce(ag.alunos_ativos_total, 0), 0)
    else null
  end as vagas_disponiveis,
  case
    when tb.capacidade is not null and tb.capacidade > 0
      then round((coalesce(ag.alunos_ativos_total, 0)::numeric / tb.capacidade::numeric) * 100)
    else null
  end as ocupacao_percentual,
  coalesce(ag.pagantes_total, 0) as pagantes_total,
  coalesce(ag.concessao_total, 0) as concessao_total,
  coalesce(ag.concessao_integral_total, 0) as concessao_integral_total,
  coalesce(ag.concessao_parcial_total, 0) as concessao_parcial_total,
  coalesce(ag.outros_vinculos_total, 0) as outros_vinculos_total,
  coalesce(dn.distribuicao_niveis_json, '[]'::jsonb) as distribuicao_niveis_json,
  jsonb_build_object(
    'pagantes', coalesce(ag.pagantes_total, 0),
    'concessao', coalesce(ag.concessao_total, 0),
    'concessao_integral', coalesce(ag.concessao_integral_total, 0),
    'concessao_parcial', coalesce(ag.concessao_parcial_total, 0),
    'concessao_generica', greatest(
      coalesce(ag.concessao_total, 0)
      - coalesce(ag.concessao_integral_total, 0)
      - coalesce(ag.concessao_parcial_total, 0),
      0
    ),
    'outros_vinculos', coalesce(ag.outros_vinculos_total, 0)
  ) as distribuicao_vinculos_json
from turmas_base tb
left join agregados_por_turma ag
  on ag.turma_id = tb.turma_id
left join distribuicao_niveis dn
  on dn.turma_id = tb.turma_id;

comment on view public.vw_escola_dashboard_turmas_composicao is
'View canonica do dashboard SaaS da Escola para composicao operacional e institucional das turmas ativas. Nao substitui relatorios analiticos detalhados.';

commit;
