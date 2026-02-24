-- Agenda do professor (hoje) baseada no Modelo de Turmas:
-- turmas.dias_semana (text[]) + hora_inicio/hora_fim + professor_id + status

begin;
-- Funcao: converte date -> dia da semana em PT-BR no formato canonico
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
comment on function public.fn_dia_semana_pt(date) is
'Dado uma data, retorna o nome do dia da semana em PT-BR (Segunda..Domingo) compativel com turmas.dias_semana.';
-- View: agenda de hoje para TODOS os professores
-- (a API filtra pelo professor logado)
create or replace view public.vw_professor_agenda_hoje as
select
  t.professor_id,
  t.turma_id,
  t.nome as turma_nome,
  t.curso,
  t.nivel,
  t.turno,
  t.ano_referencia,
  t.hora_inicio,
  t.hora_fim,
  t.dias_semana,
  t.status
from public.turmas t
where
  t.status = 'ATIVA'
  and t.professor_id is not null
  and t.dias_semana is not null
  and exists (
    select 1
    from unnest(t.dias_semana) as d(dia)
    where upper(trim(d.dia)) = upper(public.fn_dia_semana_pt(current_date))
  )
order by
  t.hora_inicio asc,
  t.nome asc;
comment on view public.vw_professor_agenda_hoje is
'Agenda do dia atual (current_date) para turmas ATIVAS. Filtrar por professor_id na API.';
commit;
