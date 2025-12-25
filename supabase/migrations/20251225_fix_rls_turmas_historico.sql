begin;

-- Garantir que RLS esteja habilitado
alter table public.turmas_historico enable row level security;

-- Remover policy deny anterior (se existir)
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='turmas_historico'
      and policyname='turmas_historico_insert_denied'
  ) then
    drop policy turmas_historico_insert_denied on public.turmas_historico;
  end if;
end $$;

-- Permitir INSERT somente quando chamado dentro de trigger
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='turmas_historico'
      and policyname='turmas_historico_insert_from_trigger_only'
  ) then
    create policy turmas_historico_insert_from_trigger_only
      on public.turmas_historico
      for insert
      to authenticated
      with check (pg_trigger_depth() > 0);
  end if;
end $$;

commit;
