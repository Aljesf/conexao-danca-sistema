begin;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'doc_cgm_grupo_fk'
  ) then
    alter table public.documentos_conjuntos_grupos_modelos
      add constraint doc_cgm_grupo_fk
      foreign key (conjunto_grupo_id)
      references public.documentos_conjuntos_grupos(id)
      on delete cascade;
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'doc_cgm_modelo_fk'
  ) then
    alter table public.documentos_conjuntos_grupos_modelos
      add constraint doc_cgm_modelo_fk
      foreign key (modelo_id)
      references public.documentos_modelo(id)
      on delete cascade;
  end if;
end $$;
commit;
select pg_notify('pgrst', 'reload schema');
