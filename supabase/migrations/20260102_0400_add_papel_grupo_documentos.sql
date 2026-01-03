begin;

-- 1.1) Adicionar coluna papel
alter table public.documentos_conjuntos_grupos
  add column if not exists papel text;

-- 1.2) Backfill seguro (caso ja exista boolean obrigatorio)
update public.documentos_conjuntos_grupos
set papel =
  case
    when obrigatorio = true then 'OBRIGATORIO'
    else 'OPCIONAL'
  end
where papel is null;

-- 1.3) Constraint de dominio
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documentos_grupos_papel_chk'
  ) then
    alter table public.documentos_conjuntos_grupos
      add constraint documentos_grupos_papel_chk
      check (papel in ('PRINCIPAL','OBRIGATORIO','OPCIONAL','ADICIONAL'));
  end if;
end $$;

-- 1.4) Garantir 1 PRINCIPAL por conjunto
create unique index if not exists documentos_grupos_principal_unico
  on public.documentos_conjuntos_grupos (conjunto_id)
  where papel = 'PRINCIPAL';

commit;
select pg_notify('pgrst', 'reload schema');
