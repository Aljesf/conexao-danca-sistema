begin;

-- Colunas do schema public
create or replace function public.documentos_schema_columns()
returns table(table_name text, column_name text, data_type text, is_nullable text)
language sql
stable
as $$
  select
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  from information_schema.columns c
  where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position;
$$;

-- Colunas de uma tabela especifica (para UI)
create or replace function public.documentos_schema_table_columns(p_table text)
returns table(column_name text, data_type text, is_nullable text)
language sql
stable
as $$
  select
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name::text = p_table
  order by c.ordinal_position;
$$;

-- FKs do schema public (uma linha por coluna FK)
create or replace function public.documentos_schema_fks()
returns table(from_table text, from_column text, to_table text, to_column text, constraint_name text)
language sql
stable
as $$
  select
    tc.table_name::text as from_table,
    kcu.column_name::text as from_column,
    ccu.table_name::text as to_table,
    ccu.column_name::text as to_column,
    tc.constraint_name::text as constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.constraint_type = 'FOREIGN KEY'
  order by from_table, from_column;
$$;

-- FKs saindo de uma tabela (adjacencia) - base do wizard 3 saltos
create or replace function public.documentos_schema_adj(p_table text)
returns table(from_table text, from_column text, to_table text, to_column text, constraint_name text)
language sql
stable
as $$
  select
    f.from_table,
    f.from_column,
    f.to_table,
    f.to_column,
    f.constraint_name
  from public.documentos_schema_fks() f
  where f.from_table = p_table;
$$;

commit;

select pg_notify('pgrst', 'reload schema');
