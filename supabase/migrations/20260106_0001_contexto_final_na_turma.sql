-- Contexto é sempre da Turma (unidade temporal)
alter table public.turmas
  add column if not exists contexto_matricula_id bigint
  references public.escola_contextos_matricula(id)
  on delete restrict;

create index if not exists idx_turmas_contexto
  on public.turmas(contexto_matricula_id);
