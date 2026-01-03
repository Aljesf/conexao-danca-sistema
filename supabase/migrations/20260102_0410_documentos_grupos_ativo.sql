begin;

alter table public.documentos_grupos
  add column if not exists ativo boolean not null default true;

commit;

select pg_notify('pgrst', 'reload schema');
