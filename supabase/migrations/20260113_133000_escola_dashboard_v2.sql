-- Dashboard Escola - V2
-- Corrige regra de matriculas efetivadas (data + status)
-- Adiciona tendencias 30d e listagem aluno x turma

begin;

-- KPI (corrigido)
create or replace view public.vw_escola_dashboard_kpis as
with matriculas_base as (
  select
    m.id,
    m.pessoa_id,
    m.status_fluxo,
    m.concluida_em,
    m.updated_at,
    m.primeira_cobranca_status,
    m.primeira_cobranca_data_pagamento,
    (
      m.status_fluxo::text = 'CONCLUIDA'
      or m.concluida_em is not null
      or m.primeira_cobranca_status = 'PAGO'
      or m.primeira_cobranca_data_pagamento is not null
    ) as is_efetivada,
    coalesce(
      m.concluida_em,
      case when m.status_fluxo::text = 'CONCLUIDA' then m.updated_at end,
      case when m.primeira_cobranca_data_pagamento is not null
        then (m.primeira_cobranca_data_pagamento::timestamp)
      end,
      m.updated_at
    ) as efetivada_em
  from public.matriculas m
)
select
  -- Pessoas
  (select count(*)::int from public.pessoas) as total_pessoas,
  (select count(*)::int
     from public.pessoas p
     where (p.created_at at time zone 'America/Sao_Paulo')::date = current_date
  ) as pessoas_hoje,
  (select count(*)::int
     from public.pessoas p
     where (p.created_at at time zone 'America/Sao_Paulo')::date = (current_date - 1)
  ) as pessoas_ontem,

  -- Matriculas efetivadas
  (select count(*)::int from matriculas_base mb where mb.is_efetivada) as matriculas_efetivadas_total,
  (select count(*)::int
     from matriculas_base mb
     where mb.is_efetivada
       and (mb.efetivada_em at time zone 'America/Sao_Paulo')::date = current_date
  ) as matriculas_efetivadas_hoje,
  (select count(*)::int
     from matriculas_base mb
     where mb.is_efetivada
       and (mb.efetivada_em at time zone 'America/Sao_Paulo')::date = (current_date - 1)
  ) as matriculas_efetivadas_ontem;

-- Turmas (mantem, mas agora vai ser usado mais como referencia)
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
  and coalesce(ta.status, 'ativo') = 'ativo'
  and ta.dt_fim is null
group by
  t.turma_id, t.nome, t.tipo_turma, t.ano_referencia, t.status, t.capacidade;

-- Serie 7 dias (corrigida para usar regra robusta + efetivada_em)
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
matriculas_base as (
  select
    coalesce(
      m.concluida_em,
      case when m.status_fluxo::text = 'CONCLUIDA' then m.updated_at end,
      case when m.primeira_cobranca_data_pagamento is not null
        then (m.primeira_cobranca_data_pagamento::timestamp)
      end,
      m.updated_at
    ) as efetivada_em,
    (
      m.status_fluxo::text = 'CONCLUIDA'
      or m.concluida_em is not null
      or m.primeira_cobranca_status = 'PAGO'
      or m.primeira_cobranca_data_pagamento is not null
    ) as is_efetivada
  from public.matriculas m
),
matriculas as (
  select
    (mb.efetivada_em at time zone 'America/Sao_Paulo')::date as dia,
    count(*)::int as qtd
  from matriculas_base mb
  where mb.is_efetivada
    and (mb.efetivada_em at time zone 'America/Sao_Paulo')::date >= (current_date - 6)
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

-- Tabela: aluno x turma (apenas vinculos ativos)
create or replace view public.vw_escola_dashboard_alunos_turma as
select
  t.turma_id,
  t.nome as turma_nome,
  ta.aluno_pessoa_id,
  p.nome as aluno_nome,
  ta.dt_inicio,
  ta.dt_fim,
  ta.status,
  ta.matricula_id
from public.turma_aluno ta
join public.turmas t on t.turma_id = ta.turma_id
join public.pessoas p on p.id = ta.aluno_pessoa_id
where coalesce(ta.status, 'ativo') = 'ativo'
  and ta.dt_fim is null
order by t.nome asc, p.nome asc;

-- Tendencias 30 dias (comparativo com 30 dias anteriores)
create or replace view public.vw_escola_dashboard_trends_30d as
with janela as (
  select
    current_date as hoje,
    (current_date - 29) as inicio_30d,
    (current_date - 59) as inicio_prev30d,
    (current_date - 30) as fim_prev30d
),
pessoas_30d as (
  select count(*)::int as qtd
  from public.pessoas p, janela j
  where (p.created_at at time zone 'America/Sao_Paulo')::date between j.inicio_30d and j.hoje
),
pessoas_prev30d as (
  select count(*)::int as qtd
  from public.pessoas p, janela j
  where (p.created_at at time zone 'America/Sao_Paulo')::date between j.inicio_prev30d and j.fim_prev30d
),
matriculas_base as (
  select
    (
      m.status_fluxo::text = 'CONCLUIDA'
      or m.concluida_em is not null
      or m.primeira_cobranca_status = 'PAGO'
      or m.primeira_cobranca_data_pagamento is not null
    ) as is_efetivada,
    (coalesce(
      m.concluida_em,
      case when m.status_fluxo::text = 'CONCLUIDA' then m.updated_at end,
      case when m.primeira_cobranca_data_pagamento is not null
        then (m.primeira_cobranca_data_pagamento::timestamp)
      end,
      m.updated_at
    ) at time zone 'America/Sao_Paulo')::date as efetivada_dia
  from public.matriculas m
),
mat_30d as (
  select count(*)::int as qtd
  from matriculas_base mb, janela j
  where mb.is_efetivada
    and mb.efetivada_dia between j.inicio_30d and j.hoje
),
mat_prev30d as (
  select count(*)::int as qtd
  from matriculas_base mb, janela j
  where mb.is_efetivada
    and mb.efetivada_dia between j.inicio_prev30d and j.fim_prev30d
),
alunos_entradas_30d as (
  select count(*)::int as qtd
  from public.turma_aluno ta, janela j
  where ta.dt_inicio between j.inicio_30d and j.hoje
),
alunos_saidas_30d as (
  select count(*)::int as qtd
  from public.turma_aluno ta, janela j
  where ta.dt_fim is not null
    and ta.dt_fim between j.inicio_30d and j.hoje
),
alunos_entradas_prev30d as (
  select count(*)::int as qtd
  from public.turma_aluno ta, janela j
  where ta.dt_inicio between j.inicio_prev30d and j.fim_prev30d
),
alunos_saidas_prev30d as (
  select count(*)::int as qtd
  from public.turma_aluno ta, janela j
  where ta.dt_fim is not null
    and ta.dt_fim between j.inicio_prev30d and j.fim_prev30d
)
select
  (select qtd from pessoas_30d) as pessoas_30d,
  (select qtd from pessoas_prev30d) as pessoas_prev30d,
  (select qtd from mat_30d) as matriculas_30d,
  (select qtd from mat_prev30d) as matriculas_prev30d,
  (select qtd from alunos_entradas_30d) as alunos_entradas_30d,
  (select qtd from alunos_saidas_30d) as alunos_saidas_30d,
  ((select qtd from alunos_entradas_30d) - (select qtd from alunos_saidas_30d)) as alunos_saldo_30d,
  (select qtd from alunos_entradas_prev30d) as alunos_entradas_prev30d,
  (select qtd from alunos_saidas_prev30d) as alunos_saidas_prev30d,
  ((select qtd from alunos_entradas_prev30d) - (select qtd from alunos_saidas_prev30d))
    as alunos_saldo_prev30d;

commit;
