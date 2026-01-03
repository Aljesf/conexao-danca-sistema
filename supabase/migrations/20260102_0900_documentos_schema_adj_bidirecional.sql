begin;

create or replace function public.documentos_schema_adj(p_table text)
returns table(
  direction text,
  from_table text,
  from_column text,
  to_table text,
  to_column text,
  constraint_name text
)
language sql
stable
as $$
  -- OUT: FKs saindo da tabela atual
  select
    'OUT'::text as direction,
    f.from_table,
    f.from_column,
    f.to_table,
    f.to_column,
    f.constraint_name
  from public.documentos_schema_fks() f
  where f.from_table = p_table

  union all

  -- IN: FKs entrando na tabela atual
  select
    'IN'::text as direction,
    f.from_table,
    f.from_column,
    f.to_table,
    f.to_column,
    f.constraint_name
  from public.documentos_schema_fks() f
  where f.to_table = p_table

  order by direction, from_table, from_column;
$$;

commit;
select pg_notify('pgrst', 'reload schema');
