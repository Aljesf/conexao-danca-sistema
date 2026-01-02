begin;

-- Ensure canonical pivot table name exists or rename legacy tables.
do $$
begin
  if to_regclass('public.documentos_grupos_modelos') is not null then
    null;
  elsif to_regclass('public.documentos_grupos_modelo') is not null then
    alter table public.documentos_grupos_modelo rename to documentos_grupos_modelos;
  elsif to_regclass('public.documentos_grupo_modelos') is not null then
    alter table public.documentos_grupo_modelos rename to documentos_grupos_modelos;
  else
    create table public.documentos_grupos_modelos (
      grupo_id bigint not null references public.documentos_grupos(id) on delete cascade,
      documento_modelo_id bigint not null references public.documentos_modelo(id) on delete restrict,
      primary key (grupo_id, documento_modelo_id)
    );
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
