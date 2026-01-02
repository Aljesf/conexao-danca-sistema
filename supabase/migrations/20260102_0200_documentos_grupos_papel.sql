begin;

alter table public.documentos_grupos
  add column if not exists papel text;

update public.documentos_grupos
set papel = case
  when coalesce(obrigatorio,false) = true then 'OBRIGATORIO'
  else 'OPCIONAL'
end
where papel is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_grupos_papel_check') then
    alter table public.documentos_grupos
      add constraint documentos_grupos_papel_check
      check (papel in ('PRINCIPAL','OBRIGATORIO','OPCIONAL','ADICIONAL'));
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
