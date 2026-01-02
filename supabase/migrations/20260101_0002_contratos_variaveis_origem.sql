begin;

update public.contratos_variaveis
set origem = 'ALUNO'
where origem = 'PESSOA';

update public.contratos_variaveis
set origem = 'RESPONSAVEL_FINANCEIRO'
where origem = 'RESPONSAVEL';

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.contratos_variaveis'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%origem in%';

  if cname is not null then
    execute format('alter table public.contratos_variaveis drop constraint %I', cname);
  end if;

  alter table public.contratos_variaveis
    add constraint contratos_variaveis_origem_check
    check (origem in (
      'ALUNO',
      'RESPONSAVEL_FINANCEIRO',
      'MATRICULA',
      'TURMA',
      'ESCOLA',
      'FINANCEIRO',
      'MANUAL'
    ));
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
