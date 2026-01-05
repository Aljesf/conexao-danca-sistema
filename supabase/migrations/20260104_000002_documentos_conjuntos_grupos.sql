begin;

create table if not exists public.documentos_conjuntos_grupos (
  id bigserial primary key,
  conjunto_id bigint,
  grupo_id bigint,
  ordem integer default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

commit;

select pg_notify('pgrst', 'reload schema');
