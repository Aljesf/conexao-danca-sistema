-- =========================================
-- Matriculas: status_fluxo (rascunho/pendente/concluida) + rastreabilidade
-- Data: 2026-01-13
-- =========================================

begin;

-- 1) Colunas auxiliares
alter table public.matriculas
  add column if not exists status_fluxo text,
  add column if not exists concluida_em timestamptz,
  add column if not exists cancelada_em timestamptz,
  add column if not exists motivo_cancelamento text;

-- 2) Default conservador (mantem rascunho como ponto de partida)
alter table public.matriculas
  alter column status_fluxo set default 'RASCUNHO';

-- 3) Backfill para linhas antigas (conservador)
update public.matriculas
set status_fluxo = 'CONCLUIDA'
where status_fluxo is null;

-- 4) Remover checks anteriores que limitam status_fluxo
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.matriculas'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status_fluxo%'
  loop
    execute format('alter table public.matriculas drop constraint %I', r.conname);
  end loop;
end $$;

-- 5) Novo check com valores expandidos
alter table public.matriculas
  add constraint matriculas_status_fluxo_check
  check (status_fluxo in ('RASCUNHO','AGUARDANDO_LIQUIDACAO','PENDENTE_CONFIRMACAO','ATIVA','CANCELADA','CONCLUIDA'));

-- 6) Indices
create index if not exists idx_matriculas_status_fluxo
  on public.matriculas(status_fluxo);

create index if not exists idx_matriculas_concluida_em
  on public.matriculas(concluida_em);

commit;
