begin;

create or replace function public.admin_schema_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  role_text text;
  tables_json jsonb;
  cols_colecoes jsonb;
  cols_variaveis jsonb;
  sample_colecoes jsonb;
  sample_variaveis jsonb;
begin
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  role_text := coalesce(claims ->> 'role', '');

  if role_text <> 'service_role' then
    raise exception 'Acesso negado: apenas service_role';
  end if;

  select coalesce(jsonb_agg(t.table_name order by t.table_name), '[]'::jsonb)
    into tables_json
  from information_schema.tables t
  where t.table_schema = 'public'
    and (
      t.table_name ilike '%colec%'
      or t.table_name ilike '%variav%'
      or t.table_name ilike '%documento%'
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object('column_name', c.column_name, 'data_type', c.data_type)
      order by c.ordinal_position
    ),
    '[]'::jsonb
  )
  into cols_colecoes
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'documentos_colecoes';

  select coalesce(
    jsonb_agg(
      jsonb_build_object('column_name', c.column_name, 'data_type', c.data_type)
      order by c.ordinal_position
    ),
    '[]'::jsonb
  )
  into cols_variaveis
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'documentos_variaveis';

  begin
    execute
      'select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), ''[]''::jsonb)
       from (select * from public.documentos_colecoes order by id desc limit 100) x'
      into sample_colecoes;
  exception
    when undefined_table then
      sample_colecoes := jsonb_build_object('error', 'Tabela public.documentos_colecoes nao existe');
  end;

  begin
    execute
      'select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), ''[]''::jsonb)
       from (select * from public.documentos_variaveis order by id desc limit 200) x'
      into sample_variaveis;
  exception
    when undefined_table then
      sample_variaveis := jsonb_build_object('error', 'Tabela public.documentos_variaveis nao existe');
  end;

  return jsonb_build_object(
    'tables', tables_json,
    'columns', jsonb_build_object(
      'documentos_colecoes', cols_colecoes,
      'documentos_variaveis', cols_variaveis
    ),
    'samples', jsonb_build_object(
      'documentos_colecoes', sample_colecoes,
      'documentos_variaveis', sample_variaveis
    )
  );
end;
$$;

revoke all on function public.admin_schema_snapshot() from public;
revoke all on function public.admin_schema_snapshot() from anon;
revoke all on function public.admin_schema_snapshot() from authenticated;

commit;

select pg_notify('pgrst', 'reload schema');
