-- Dashboard Escola - Views sem status_fluxo
-- Ajusta regra de efetivacao usando primeira_cobranca_* + excecao

begin;

create or replace view public.vw_escola_dashboard_kpis as
with matriculas_base as (
  select
    m.id,
    m.pessoa_id,
    m.status,
    m.primeira_cobranca_status,
    m.primeira_cobranca_data_pagamento,
    m.excecao_criada_em,
    m.updated_at,
    m.created_at,
    (
      upper(coalesce(m.primeira_cobranca_status, '')) in ('PAGA','PAGO','LANCADA_CARTAO','ADIADA_EXCECAO')
      or m.primeira_cobranca_data_pagamento is not null
    ) as is_efetivada,
    coalesce(
      m.primeira_cobranca_data_pagamento,
      case
        when upper(coalesce(m.primeira_cobranca_status, '')) = 'ADIADA_EXCECAO' then m.excecao_criada_em
      end,
      m.updated_at,
      m.created_at
    ) as efetivada_em
  from public.matriculas m
)
select
  (select count(*)::int from public.pessoas) as total_pessoas,
  (select count(*)::int
     from public.pessoas p
     where (p.created_at at time zone 'America/Sao_Paulo')::date = current_date
  ) as pessoas_hoje,
  (select count(*)::int
     from public.pessoas p
     where (p.created_at at time zone 'America/Sao_Paulo')::date = (current_date - 1)
  ) as pessoas_ontem,
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
      m.primeira_cobranca_data_pagamento,
      case
        when upper(coalesce(m.primeira_cobranca_status, '')) = 'ADIADA_EXCECAO' then m.excecao_criada_em
      end,
      m.updated_at,
      m.created_at
    ) as efetivada_em,
    (
      upper(coalesce(m.primeira_cobranca_status, '')) in ('PAGA','PAGO','LANCADA_CARTAO','ADIADA_EXCECAO')
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
      upper(coalesce(m.primeira_cobranca_status, '')) in ('PAGA','PAGO','LANCADA_CARTAO','ADIADA_EXCECAO')
      or m.primeira_cobranca_data_pagamento is not null
    ) as is_efetivada,
    (coalesce(
      m.primeira_cobranca_data_pagamento,
      case
        when upper(coalesce(m.primeira_cobranca_status, '')) = 'ADIADA_EXCECAO' then m.excecao_criada_em
      end,
      m.updated_at,
      m.created_at
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
