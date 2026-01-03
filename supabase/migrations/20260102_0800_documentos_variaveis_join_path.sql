begin;

-- Evolui documentos_variaveis para permitir resolucao pelo banco (join_path)
alter table public.documentos_variaveis
  add column if not exists root_table text;

alter table public.documentos_variaveis
  add column if not exists root_pk_column text;

alter table public.documentos_variaveis
  add column if not exists join_path jsonb;

alter table public.documentos_variaveis
  add column if not exists target_table text;

alter table public.documentos_variaveis
  add column if not exists target_column text;

-- Defaults seguros
update public.documentos_variaveis
set root_pk_column = coalesce(root_pk_column, 'id')
where root_pk_column is null;

-- Indices para busca
create index if not exists documentos_variaveis_root_table_idx
  on public.documentos_variaveis(root_table);

create index if not exists documentos_variaveis_target_table_idx
  on public.documentos_variaveis(target_table);

commit;

select pg_notify('pgrst', 'reload schema');
