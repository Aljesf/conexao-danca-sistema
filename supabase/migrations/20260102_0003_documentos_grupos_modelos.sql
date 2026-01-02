begin;

create table if not exists public.documentos_grupos_modelos (
  grupo_id bigint not null references public.documentos_grupos(id) on delete cascade,
  documento_modelo_id bigint not null references public.documentos_modelo(id) on delete restrict,
  primary key (grupo_id, documento_modelo_id)
);

commit;

select pg_notify('pgrst', 'reload schema');
