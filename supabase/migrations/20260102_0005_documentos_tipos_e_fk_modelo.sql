begin;

-- 1) Tabela de tipos de documento (classificacao)
create table if not exists public.documentos_tipos (
  tipo_documento_id bigserial primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Compat: se a tabela ja existe com coluna id, renomear para tipo_documento_id.
do $$
begin
  if to_regclass('public.documentos_tipos') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'documentos_tipos'
        and column_name = 'id'
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'documentos_tipos'
        and column_name = 'tipo_documento_id'
    ) then
      alter table public.documentos_tipos
        rename column id to tipo_documento_id;
    end if;
  end if;
end $$;

-- 2) Vinculo do Modelo -> Tipo (FK)
alter table public.documentos_modelo
  add column if not exists tipo_documento_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documentos_modelo_tipo_documento_fk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_tipo_documento_fk
      foreign key (tipo_documento_id)
      references public.documentos_tipos(tipo_documento_id)
      on delete restrict;
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
