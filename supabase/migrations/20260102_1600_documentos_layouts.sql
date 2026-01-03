begin;

create table if not exists public.documentos_layouts (
  layout_id bigserial primary key,
  nome text not null,
  tags text[] not null default '{}',
  cabecalho_html text,
  rodape_html text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists documentos_layouts_ativo_idx on public.documentos_layouts(ativo);
create index if not exists documentos_layouts_tags_gin on public.documentos_layouts using gin(tags);

alter table public.documentos_modelo
  add column if not exists layout_id bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_modelo_layout_fk') then
    alter table public.documentos_modelo
      add constraint documentos_modelo_layout_fk
      foreign key (layout_id)
      references public.documentos_layouts(layout_id)
      on delete set null;
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
