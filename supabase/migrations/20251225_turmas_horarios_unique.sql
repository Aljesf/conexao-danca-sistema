begin;

create unique index if not exists turmas_horarios_turma_dia_uniq
  on public.turmas_horarios (turma_id, day_of_week);

create index if not exists turmas_horarios_turma_id_idx
  on public.turmas_horarios (turma_id);

commit;
