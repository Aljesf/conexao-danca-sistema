begin;

-- Base operacional do App Professor:
-- 1) agenda operacional do dia
-- 2) aniversariantes do dia e da semana
-- 3) consultas operacionais sem alterar o schema canonico de frequencia

create or replace function public.fn_dia_semana_pt(p_data date)
returns text
language sql
stable
as $$
  select case extract(isodow from p_data)::int
    when 1 then 'Segunda'
    when 2 then 'Terca'
    when 3 then 'Quarta'
    when 4 then 'Quinta'
    when 5 then 'Sexta'
    when 6 then 'Sabado'
    when 7 then 'Domingo'
  end;
$$;

create or replace view public.vw_app_professor_agenda_hoje as
with professor_vinculado as (
  select
    tp.turma_id,
    tp.colaborador_id,
    tp.principal,
    row_number() over (
      partition by tp.turma_id
      order by tp.principal desc, tp.data_inicio desc, tp.id asc
    ) as ordem
  from public.turma_professores tp
  where
    tp.ativo = true
    and tp.data_inicio <= current_date
    and (tp.data_fim is null or tp.data_fim >= current_date)
)
select
  t.turma_id,
  t.nome as turma_nome,
  coalesce(pv.colaborador_id, t.professor_id) as professor_id,
  prof_pessoa.nome as professor_nome,
  t.hora_inicio,
  t.hora_fim,
  esp.nome as sala,
  t.curso,
  t.nivel,
  t.turno,
  t.ano_referencia,
  t.periodo_letivo_id,
  t.espaco_id
from public.turmas t
left join professor_vinculado pv
  on pv.turma_id = t.turma_id
 and pv.ordem = 1
left join public.colaboradores prof_colab
  on prof_colab.id = coalesce(pv.colaborador_id, t.professor_id)
left join public.pessoas prof_pessoa
  on prof_pessoa.id = prof_colab.pessoa_id
left join public.espacos esp
  on esp.id = t.espaco_id
where
  upper(coalesce(t.status, '')) = 'ATIVA'
  and t.dias_semana is not null
  and exists (
    select 1
    from unnest(t.dias_semana) as d(dia)
    where upper(trim(d.dia)) = upper(public.fn_dia_semana_pt(current_date))
  )
order by
  t.hora_inicio asc nulls last,
  t.nome asc;

comment on view public.vw_app_professor_agenda_hoje is
'Agenda operacional do App Professor para o dia atual, com turma, professor e sala.';

create or replace view public.vw_app_professor_aniversariantes_dia as
with base as (
  select distinct on ('ALUNO', p.id)
    ('ALUNO-' || p.id::text) as id,
    p.id as pessoa_id,
    p.nome,
    p.nascimento,
    'ALUNO'::text as tipo
  from public.turma_aluno ta
  join public.pessoas p
    on p.id = ta.aluno_pessoa_id
  where
    p.nascimento is not null
    and (ta.dt_fim is null or ta.dt_fim >= current_date)
    and upper(coalesce(ta.status, 'ATIVA')) not in ('INATIVA', 'CANCELADA')

  union all

  select distinct on ('COLABORADOR', p.id)
    ('COLABORADOR-' || p.id::text) as id,
    p.id as pessoa_id,
    p.nome,
    p.nascimento,
    'COLABORADOR'::text as tipo
  from public.colaboradores c
  join public.pessoas p
    on p.id = c.pessoa_id
  where
    c.ativo = true
    and p.nascimento is not null
)
select
  b.id,
  b.pessoa_id,
  b.nome,
  b.nascimento,
  b.tipo
from base b
where to_char(b.nascimento, 'MM-DD') = to_char(current_date, 'MM-DD')
order by b.nome asc;

comment on view public.vw_app_professor_aniversariantes_dia is
'Aniversariantes do dia (alunos e colaboradores ativos) para o App Professor.';

create or replace view public.vw_app_professor_aniversariantes_semana as
with base as (
  select distinct on ('ALUNO', p.id)
    ('ALUNO-' || p.id::text) as id,
    p.id as pessoa_id,
    p.nome,
    p.nascimento,
    'ALUNO'::text as tipo
  from public.turma_aluno ta
  join public.pessoas p
    on p.id = ta.aluno_pessoa_id
  where
    p.nascimento is not null
    and (ta.dt_fim is null or ta.dt_fim >= current_date)
    and upper(coalesce(ta.status, 'ATIVA')) not in ('INATIVA', 'CANCELADA')

  union all

  select distinct on ('COLABORADOR', p.id)
    ('COLABORADOR-' || p.id::text) as id,
    p.id as pessoa_id,
    p.nome,
    p.nascimento,
    'COLABORADOR'::text as tipo
  from public.colaboradores c
  join public.pessoas p
    on p.id = c.pessoa_id
  where
    c.ativo = true
    and p.nascimento is not null
),
janela as (
  select generate_series(current_date, current_date + 6, interval '1 day')::date as data_ref
)
select
  b.id,
  b.pessoa_id,
  b.nome,
  b.nascimento,
  b.tipo,
  j.data_ref as data_aniversario_referencia
from base b
join janela j
  on to_char(b.nascimento, 'MM-DD') = to_char(j.data_ref, 'MM-DD')
order by
  j.data_ref asc,
  b.nome asc;

comment on view public.vw_app_professor_aniversariantes_semana is
'Aniversariantes dos proximos 7 dias (incluindo hoje) para o App Professor.';

commit;
