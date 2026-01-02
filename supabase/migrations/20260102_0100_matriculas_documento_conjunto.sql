begin;

alter table public.matriculas
  add column if not exists documento_conjunto_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_documento_conjunto_fk'
  ) then
    alter table public.matriculas
      add constraint matriculas_documento_conjunto_fk
      foreign key (documento_conjunto_id)
      references public.documentos_conjuntos(id)
      on delete set null;
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
