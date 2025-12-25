-- Colunas relevantes em turmas
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema='public'
  and table_name='turmas'
  and column_name in ('dias_semana','dias_horarios','horarios','horarios_json','grade_horarios')
order by column_name;

-- Tabelas provaveis de horarios
select
  table_name
from information_schema.tables
where table_schema='public'
  and table_name ilike '%turma%horar%';

-- Colunas das tabelas de horarios (ajuste os nomes conforme o retorno acima)
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('turma_horarios','turmas_horarios')
order by table_name, ordinal_position;
