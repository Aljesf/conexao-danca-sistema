begin;

create or replace function public.documentos_resolver_por_join_path(
  p_root_table text,
  p_root_pk text,
  p_root_id bigint,
  p_join_path jsonb,
  p_target_table text,
  p_target_column text
)
returns text
language plpgsql
stable
as $$
declare
  sql text;
  join_item jsonb;
  where_clause text;
  i int := 0;
begin
  -- valida existencia da tabela root
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = p_root_table
  ) then
    return null;
  end if;

  -- valida target table/column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_target_table and column_name = p_target_column
  ) then
    return null;
  end if;

  -- base
  sql := 'select ' || quote_ident(p_target_table) || '.' || quote_ident(p_target_column) ||
         ' from ' || quote_ident(p_root_table);

  -- joins (ate 3)
  if p_join_path is not null then
    for join_item in
      select * from jsonb_array_elements(p_join_path)
    loop
      i := i + 1;
      if i > 3 then
        exit;
      end if;

      -- join_item deve ter: from_table, from_column, to_table, to_column
      sql := sql || ' join ' || quote_ident(join_item->>'to_table')
                 || ' on ' || quote_ident(join_item->>'from_table') || '.' || quote_ident(join_item->>'from_column')
                 || ' = '  || quote_ident(join_item->>'to_table')   || '.' || quote_ident(join_item->>'to_column');
    end loop;
  end if;

  where_clause := ' where ' || quote_ident(p_root_table) || '.' || quote_ident(p_root_pk) || ' = $1';
  sql := sql || where_clause || ' limit 1';

  return (execute sql using p_root_id);
exception
  when others then
    return null;
end;
$$;

commit;

select pg_notify('pgrst', 'reload schema');
