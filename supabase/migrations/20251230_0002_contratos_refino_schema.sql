begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contratos_emitidos_status_assinatura_check'
  ) then
    alter table public.contratos_emitidos
      add constraint contratos_emitidos_status_assinatura_check
      check (status_assinatura in ('PENDENTE','ASSINADO','CANCELADO'));
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
