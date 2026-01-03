begin;

-- 1) Tipos de documento (classificacao)
create table if not exists public.documentos_tipos (
  tipo_documento_id bigserial primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- 2) Modelos: FK para tipo de documento
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

-- 3) Modelos: vinculo ao GRUPO do conjunto (conjunto e derivado via grupo)
alter table public.documentos_modelo
  add column if not exists conjunto_grupo_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documentos_modelo_conjunto_grupo_fk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_conjunto_grupo_fk
      foreign key (conjunto_grupo_id)
      references public.documentos_grupos(id)
      on delete set null;
  end if;
end $$;

create index if not exists documentos_modelo_tipo_documento_id_idx
  on public.documentos_modelo(tipo_documento_id);

create index if not exists documentos_modelo_conjunto_grupo_id_idx
  on public.documentos_modelo(conjunto_grupo_id);

commit;

select pg_notify('pgrst', 'reload schema');
