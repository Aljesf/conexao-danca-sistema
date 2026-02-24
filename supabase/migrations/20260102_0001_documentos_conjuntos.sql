begin;
create table if not exists public.documentos_conjuntos (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
commit;
select pg_notify('pgrst', 'reload schema');
