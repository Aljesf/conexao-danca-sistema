begin;

-- Vinculo N:N para permitir:
-- - varios modelos por grupo
-- - (opcional) reuso de modelo em varios grupos
-- - ordenacao por grupo
create table if not exists public.documentos_conjuntos_grupos_modelos (
  grupo_modelo_id bigserial primary key,
  conjunto_grupo_id bigint not null,
  modelo_id bigint not null,
  ordem int not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- FK -> grupo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'doc_grupo_modelo_grupo_fk') then
    alter table public.documentos_conjuntos_grupos_modelos
      add constraint doc_grupo_modelo_grupo_fk
      foreign key (conjunto_grupo_id)
      references public.documentos_conjuntos_grupos(id)
      on delete cascade;
  end if;
end $$;

-- FK -> modelo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'doc_grupo_modelo_modelo_fk') then
    alter table public.documentos_conjuntos_grupos_modelos
      add constraint doc_grupo_modelo_modelo_fk
      foreign key (modelo_id)
      references public.documentos_modelo(id)
      on delete cascade;
  end if;
end $$;

-- Evitar duplicidade do mesmo modelo no mesmo grupo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'doc_grupo_modelo_uniq') then
    alter table public.documentos_conjuntos_grupos_modelos
      add constraint doc_grupo_modelo_uniq unique (conjunto_grupo_id, modelo_id);
  end if;
end $$;

create index if not exists doc_grupo_modelo_grupo_idx
  on public.documentos_conjuntos_grupos_modelos(conjunto_grupo_id);

create index if not exists doc_grupo_modelo_modelo_idx
  on public.documentos_conjuntos_grupos_modelos(modelo_id);

commit;

select pg_notify('pgrst', 'reload schema');
