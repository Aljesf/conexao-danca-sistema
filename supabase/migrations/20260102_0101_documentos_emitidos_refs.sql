begin;

alter table public.documentos_emitidos
  add column if not exists documento_conjunto_id bigint;

alter table public.documentos_emitidos
  add column if not exists documento_grupo_id bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_emitidos_conjunto_fk') then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_conjunto_fk
      foreign key (documento_conjunto_id)
      references public.documentos_conjuntos(id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'documentos_emitidos_grupo_fk') then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_grupo_fk
      foreign key (documento_grupo_id)
      references public.documentos_grupos(id)
      on delete set null;
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
