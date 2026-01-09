begin;

alter table public.turma_aulas
  add column if not exists fechada_em timestamptz null,
  add column if not exists fechada_por uuid null;

create index if not exists idx_turma_aulas_fechada_em on public.turma_aulas (fechada_em);

commit;
