begin;

-- 1) Funcao que "chuta" relacoes pelo schema:
--    - procura colunas em p_table que terminam com _id
--    - tenta casar com tabelas existentes no public:
--      a) nome = base (sem _id)
--      b) nome = base + 's'
--      c) nome = base + 'es'
--    - tambem tenta o inverso (IN): outras tabelas que tem <p_table_singular>_id ou <p_table>_id
create or replace function public.documentos_schema_adj_guess(p_table text)
returns table(
  direction text,
  from_table text,
  from_column text,
  to_table text,
  to_column text,
  reason text
)
language plpgsql
stable
as $$
declare
  col record;
  base text;
  cand text;
  cand2 text;
  cand3 text;
begin
  -- OUT guesses: p_table.<algo>_id -> <tabela>.id
  for col in
    select c.column_name::text as column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = p_table
      and c.column_name like '%\_id' escape '\'
  loop
    base := regexp_replace(col.column_name, '_id$', '');

    cand := base;
    cand2 := base || 's';
    cand3 := base || 'es';

    -- tenta achar tabela candidata e assume PK 'id'
    if exists (select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=cand) then
      direction := 'OUT_GUESS'; from_table := p_table; from_column := col.column_name; to_table := cand; to_column := 'id'; reason := 'column_suffix_id';
      return next;
    elsif exists (select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=cand2) then
      direction := 'OUT_GUESS'; from_table := p_table; from_column := col.column_name; to_table := cand2; to_column := 'id'; reason := 'column_suffix_id_plural_s';
      return next;
    elsif exists (select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=cand3) then
      direction := 'OUT_GUESS'; from_table := p_table; from_column := col.column_name; to_table := cand3; to_column := 'id'; reason := 'column_suffix_id_plural_es';
      return next;
    end if;
  end loop;

  -- IN guesses: <outra_tabela>.<p_table>_id -> p_table.id
  for col in
    select c.table_name::text as table_name, c.column_name::text as column_name
    from information_schema.columns c
    where c.table_schema='public'
      and (c.column_name = (p_table || '_id') or c.column_name = (regexp_replace(p_table, 's$', '') || '_id'))
  loop
    direction := 'IN_GUESS';
    from_table := col.table_name;
    from_column := col.column_name;
    to_table := p_table;
    to_column := 'id';
    reason := 'reverse_column_suffix_id';
    return next;
  end loop;

  return;
end;
$$;

-- 2) Atualiza a funcao principal de adjacencia para unir:
--    - FKs reais (OUT/IN) via documentos_schema_fks()
--    - guesses por *_id (OUT_GUESS/IN_GUESS)
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
  -- OUT real
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

  -- IN real
  select
    'IN'::text as direction,
    f.from_table,
    f.from_column,
    f.to_table,
    f.to_column,
    f.constraint_name
  from public.documentos_schema_fks() f
  where f.to_table = p_table

  union all

  -- OUT/IN guess
  select
    g.direction,
    g.from_table,
    g.from_column,
    g.to_table,
    g.to_column,
    null::text as constraint_name
  from public.documentos_schema_adj_guess(p_table) g

  order by direction, from_table, from_column;
$$;

commit;

select pg_notify('pgrst', 'reload schema');
