-- Dashboard Escola - Views canonicas (KPIs + Turmas + Serie 7d)
-- Data: 2026-01-13

begin;
-- 1) KPIs gerais
create or replace view public.vw_escola_dashboard_kpis as
select
  -- Pessoas
  (select count(*)::int from public.pessoas) as total_pessoas,
  (select count(*)::int
   from public.pessoas p
   where (p.created_at at time zone 'America/Sao_Paulo')::date = current_date) as pessoas_hoje,
  (select count(*)::int
   from public.pessoas p
   where (p.created_at at time zone 'America/Sao_Paulo')::date = (current_date - 1)) as pessoas_ontem,

  -- Matriculas efetivadas (base: concluida_em)
  (select count(*)::int
   from public.matriculas m
   where m.concluida_em is not null) as matriculas_efetivadas_total,
  (select count(*)::int
   from public.matriculas m
   where m.concluida_em is not null
     and (m.concluida_em at time zone 'America/Sao_Paulo')::date = current_date
  ) as matriculas_efetivadas_hoje,
  (select count(*)::int
   from public.matriculas m
   where m.concluida_em is not null
     and (m.concluida_em at time zone 'America/Sao_Paulo')::date = (current_date - 1)
  ) as matriculas_efetivadas_ontem;
-- 2) Alunos ativos por turma (vinculo operacional via turma_aluno)
create or replace view public.vw_escola_dashboard_turmas as
select
  t.turma_id,
  t.nome,
  t.tipo_turma,
  t.ano_referencia,
  t.status,
  t.capacidade,
  count(distinct ta.aluno_pessoa_id)::int as alunos_ativos
from public.turmas t
left join public.turma_aluno ta
  on ta.turma_id = t.turma_id
  and lower(coalesce(ta.status, 'ativo')) = 'ativo'
  and ta.dt_fim is null
group by
  t.turma_id, t.nome, t.tipo_turma, t.ano_referencia, t.status, t.capacidade;
-- 3) Serie de 7 dias (pessoas + matriculas efetivadas)
create or replace view public.vw_escola_dashboard_series_7d as
with dias as (
  select generate_series(current_date - 6, current_date, interval '1 day')::date as dia
),
pessoas as (
  select
    (p.created_at at time zone 'America/Sao_Paulo')::date as dia,
    count(*)::int as qtd
  from public.pessoas p
  where (p.created_at at time zone 'America/Sao_Paulo')::date >= (current_date - 6)
  group by 1
),
matriculas as (
  select
    (m.concluida_em at time zone 'America/Sao_Paulo')::date as dia,
    count(*)::int as qtd
  from public.matriculas m
  where m.concluida_em is not null
    and (m.concluida_em at time zone 'America/Sao_Paulo')::date >= (current_date - 6)
  group by 1
)
select
  d.dia,
  coalesce(p.qtd, 0)::int as pessoas_cadastradas,
  coalesce(m.qtd, 0)::int as matriculas_efetivadas
from dias d
left join pessoas p on p.dia = d.dia
left join matriculas m on m.dia = d.dia
order by d.dia;
commit;
