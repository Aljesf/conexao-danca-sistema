-- 2026-01-08 - CPF opcional, porem normalizado e validado quando preenchido.
-- Regras:
-- - pessoas.cpf armazenado somente como digitos (11).
-- - cpf vazio vira NULL.
-- - cpf, quando presente, deve ter 11 digitos.
-- - cpf, quando presente, deve ser unico.

begin;
-- 1) Normalizar dados existentes: remover mascara e espacos
update public.pessoas
set cpf = nullif(regexp_replace(coalesce(cpf, ''), '\D', '', 'g'), '')
where cpf is not null;
-- 2) Garantir que CPF presente tenha 11 digitos (formato)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pessoas_cpf_11_digitos_chk'
  ) then
    alter table public.pessoas
      add constraint pessoas_cpf_11_digitos_chk
      check (cpf is null or cpf ~ '^\d{11}$');
  end if;
end $$;
-- 3) Unicidade (parcial): apenas quando cpf nao e nulo
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i'
      and c.relname = 'pessoas_cpf_unq_idx'
      and n.nspname = 'public'
  ) then
    create unique index pessoas_cpf_unq_idx
      on public.pessoas (cpf)
      where cpf is not null;
  end if;
end $$;
commit;
