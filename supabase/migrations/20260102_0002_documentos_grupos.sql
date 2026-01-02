begin;

create table if not exists public.documentos_grupos (
  id bigint generated always as identity primary key,
  conjunto_id bigint not null references public.documentos_conjuntos(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  obrigatorio boolean not null default false,
  ordem integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conjunto_id, codigo)
);

commit;

select pg_notify('pgrst', 'reload schema');
