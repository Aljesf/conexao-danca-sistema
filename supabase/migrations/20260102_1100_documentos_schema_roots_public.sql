begin;

-- Lista tabelas do schema public + PK sugerida (se houver).
-- PK sugerida: primeira coluna de PK, ou fallback 'id'.
create or replace function public.documentos_schema_roots_public()
returns table(root_table text, root_pk text, label text)
language sql
stable
as $$
  with tables as (
    select t.table_name::text as table_name
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      -- filtros minimos para evitar lixo tecnico (ajuste se precisar)
      and t.table_name not ilike 'pg_%'
      and t.table_name not ilike 'sql_%'
      and t.table_name not ilike '%migrations%'
    order by t.table_name
  ),
  pks as (
    select
      tc.table_name::text as table_name,
      min(kcu.column_name::text) as pk_column
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.constraint_type = 'PRIMARY KEY'
    group by tc.table_name
  )
  select
    t.table_name as root_table,
    coalesce(p.pk_column, 'id') as root_pk,
    (t.table_name || ' (root: ' || t.table_name || '.' || coalesce(p.pk_column, 'id') || ')') as label
  from tables t
  left join pks p on p.table_name = t.table_name
  order by t.table_name;
$$;

commit;
select pg_notify('pgrst', 'reload schema');
