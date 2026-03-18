-- Verificacao de schema para estabilizacao de contas a receber
-- Objetivo: confirmar se o banco usado pela aplicacao ja possui as colunas
-- canonicas em public.cobrancas e a tabela de auditoria da migracao.

select
  now() as verificado_em,
  current_database() as database_name,
  current_user as current_user,
  inet_server_addr()::text as server_addr,
  inet_server_port() as server_port,
  version() as postgres_version;

with expected_columns as (
  select unnest(
    array[
      'origem_agrupador_tipo',
      'origem_agrupador_id',
      'origem_item_tipo',
      'origem_item_id',
      'conta_interna_id',
      'origem_label',
      'migracao_conta_interna_status',
      'migracao_conta_interna_observacao'
    ]
  ) as column_name
)
select
  expected_columns.column_name,
  columns.data_type,
  columns.is_nullable,
  columns.ordinal_position,
  (columns.column_name is not null) as exists_in_public_cobrancas
from expected_columns
left join information_schema.columns as columns
  on columns.table_schema = 'public'
 and columns.table_name = 'cobrancas'
 and columns.column_name = expected_columns.column_name
order by expected_columns.column_name;

select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  ordinal_position
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cobrancas'
  and column_name in (
    'origem_agrupador_tipo',
    'origem_agrupador_id',
    'origem_item_tipo',
    'origem_item_id',
    'conta_interna_id',
    'origem_label',
    'migracao_conta_interna_status',
    'migracao_conta_interna_observacao'
  )
order by ordinal_position;

select
  to_regclass('public.auditoria_migracao_conta_interna_cobrancas') as auditoria_table_regclass,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'auditoria_migracao_conta_interna_cobrancas'
  ) as auditoria_table_exists;
