begin;

-- Dashboard operacional do App Professor com data de referencia:
-- - agenda do dia
-- - aniversariantes do dia
-- - aniversariantes da semana operacional

create or replace function public.fn_app_professor_agenda(p_data date)
returns table (
  turma_id bigint,
  turma_nome text,
  professor_id bigint,
  professor_nome text,
  hora_inicio time,
  hora_fim time,
  sala text,
  curso text,
  nivel text,
  turno text,
  ano_referencia integer,
  periodo_letivo_id bigint,
  espaco_id bigint
)
language sql
stable
as $$
  with data_ref as (
    select coalesce(p_data, current_date)::date as data_ref
  ),
  professor_vinculado as (
    select
      tp.turma_id,
      tp.colaborador_id,
      tp.principal,
      row_number() over (
        partition by tp.turma_id
        order by tp.principal desc, tp.data_inicio desc, tp.id asc
      ) as ordem
    from public.turma_professores tp
    join data_ref d
      on tp.data_inicio <= d.data_ref
     and (tp.data_fim is null or tp.data_fim >= d.data_ref)
    where tp.ativo = true
  )
  select
    t.turma_id::bigint as turma_id,
    t.nome::text as turma_nome,
    coalesce(pv.colaborador_id, t.professor_id)::bigint as professor_id,
    prof_pessoa.nome::text as professor_nome,
    t.hora_inicio,
    t.hora_fim,
    esp.nome::text as sala,
    t.curso::text as curso,
    t.nivel::text as nivel,
    t.turno::text as turno,
    t.ano_referencia::integer as ano_referencia,
    t.periodo_letivo_id::bigint as periodo_letivo_id,
    t.espaco_id::bigint as espaco_id
  from public.turmas t
  join data_ref d on true
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
      from unnest(t.dias_semana) as dias(dia)
      where upper(trim(dias.dia)) = upper(public.fn_dia_semana_pt(d.data_ref))
    )
  order by
    t.hora_inicio asc nulls last,
    t.nome asc;
$$;

comment on function public.fn_app_professor_agenda(date) is
'Retorna a agenda operacional do App Professor para a data de referencia informada.';

create or replace function public.fn_app_professor_aniversariantes_dia(p_data date)
returns table (
  id text,
  pessoa_id bigint,
  nome text,
  nascimento date,
  tipo text
)
language sql
stable
as $$
  with data_ref as (
    select coalesce(p_data, current_date)::date as data_ref
  ),
  pessoas_base as (
    select
      ('PESSOA-' || p.id::text) as id,
      p.id::bigint as pessoa_id,
      p.nome::text as nome,
      p.nascimento::date as nascimento,
      case
        when exists (
          select 1
          from public.colaboradores c
          where c.pessoa_id = p.id
            and c.ativo = true
        ) then 'COLABORADOR'::text
        when exists (
          select 1
          from public.turma_aluno ta
          join data_ref d on true
          where ta.aluno_pessoa_id = p.id
            and upper(coalesce(ta.status, 'ATIVA')) not in ('INATIVA', 'CANCELADA')
            and (ta.dt_inicio is null or ta.dt_inicio <= d.data_ref)
            and (ta.dt_fim is null or ta.dt_fim >= d.data_ref)
        ) then 'ALUNO'::text
        when exists (
          select 1
          from public.turma_aluno ta
          where ta.aluno_pessoa_id = p.id
        ) then 'ALUNO'::text
        else 'PESSOA'::text
      end as tipo
    from public.pessoas p
    where p.nascimento is not null
  )
  select
    b.id,
    b.pessoa_id,
    b.nome,
    b.nascimento,
    b.tipo
  from pessoas_base b
  join data_ref d on true
  where to_char(b.nascimento, 'MM-DD') = to_char(d.data_ref, 'MM-DD')
  order by b.nome asc;
$$;

comment on function public.fn_app_professor_aniversariantes_dia(date) is
'Retorna aniversariantes do dia com base na data de referencia informada.';

create or replace function public.fn_app_professor_aniversariantes_semana(p_data date)
returns table (
  id text,
  pessoa_id bigint,
  nome text,
  nascimento date,
  tipo text,
  data_aniversario_referencia date
)
language sql
stable
as $$
  with data_ref as (
    select coalesce(p_data, current_date)::date as data_ref
  ),
  semana as (
    select
      date_trunc('week', d.data_ref::timestamp)::date as inicio_semana,
      (date_trunc('week', d.data_ref::timestamp)::date + 6) as fim_semana
    from data_ref d
  ),
  pessoas_base as (
    select
      ('PESSOA-' || p.id::text) as id,
      p.id::bigint as pessoa_id,
      p.nome::text as nome,
      p.nascimento::date as nascimento,
      case
        when exists (
          select 1
          from public.colaboradores c
          where c.pessoa_id = p.id
            and c.ativo = true
        ) then 'COLABORADOR'::text
        when exists (
          select 1
          from public.turma_aluno ta
          join semana s on true
          where ta.aluno_pessoa_id = p.id
            and upper(coalesce(ta.status, 'ATIVA')) not in ('INATIVA', 'CANCELADA')
            and (ta.dt_inicio is null or ta.dt_inicio <= s.fim_semana)
            and (ta.dt_fim is null or ta.dt_fim >= s.inicio_semana)
        ) then 'ALUNO'::text
        when exists (
          select 1
          from public.turma_aluno ta
          where ta.aluno_pessoa_id = p.id
        ) then 'ALUNO'::text
        else 'PESSOA'::text
      end as tipo
    from public.pessoas p
    where p.nascimento is not null
  ),
  dias_semana as (
    select generate_series(s.inicio_semana, s.fim_semana, interval '1 day')::date as data_ref
    from semana s
  )
  select
    b.id,
    b.pessoa_id,
    b.nome,
    b.nascimento,
    b.tipo,
    ds.data_ref as data_aniversario_referencia
  from pessoas_base b
  join dias_semana ds
    on to_char(b.nascimento, 'MM-DD') = to_char(ds.data_ref, 'MM-DD')
  order by
    ds.data_ref asc,
    b.nome asc;
$$;

comment on function public.fn_app_professor_aniversariantes_semana(date) is
'Retorna aniversariantes da semana operacional da data de referencia informada.';

create or replace view public.vw_app_professor_agenda_hoje as
select *
from public.fn_app_professor_agenda(current_date);

create or replace view public.vw_app_professor_aniversariantes_dia as
select *
from public.fn_app_professor_aniversariantes_dia(current_date);

create or replace view public.vw_app_professor_aniversariantes_semana as
select *
from public.fn_app_professor_aniversariantes_semana(current_date);

commit;
