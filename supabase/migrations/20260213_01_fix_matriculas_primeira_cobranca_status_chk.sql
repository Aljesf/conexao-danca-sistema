begin;

do $$
declare
  v_def text;
  v_expr text;
begin
  -- pegar definicao atual do constraint
  select pg_get_constraintdef(c.oid)
    into v_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'matriculas'
    and c.conname = 'matriculas_primeira_cobranca_status_chk'
  limit 1;

  if v_def is null then
    raise exception 'Constraint matriculas_primeira_cobranca_status_chk nao encontrado.';
  end if;

  -- Se ja estiver permitido, nao faz nada
  if v_def ilike '%LIQUIDADO_INSTITUCIONAL%' then
    raise notice 'Constraint ja permite LIQUIDADO_INSTITUCIONAL. Nada a fazer.';
    return;
  end if;

  -- Extrair a expressao interna do CHECK: CHECK ( ... )
  -- v_def vem como: CHECK ( (expressao) )
  v_expr := regexp_replace(v_def, '^CHECK\s*\((.*)\)\s*$', '\1');

  -- Recriar constraint com OR adicional
  execute 'alter table public.matriculas drop constraint matriculas_primeira_cobranca_status_chk';

  execute format(
    'alter table public.matriculas add constraint matriculas_primeira_cobranca_status_chk check ((%s) or (primeira_cobranca_status = %L))',
    v_expr,
    'LIQUIDADO_INSTITUCIONAL'
  );

  raise notice 'Constraint atualizada: agora permite LIQUIDADO_INSTITUCIONAL.';
end $$;

commit;

-- Validacao rapida (opcional no SQL Editor):
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conname = 'matriculas_primeira_cobranca_status_chk';
