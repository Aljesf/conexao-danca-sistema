begin;

-- Templates reutilizaveis para HEADER e FOOTER.
create table if not exists public.documentos_layout_templates (
  layout_template_id bigserial primary key,
  tipo text not null, -- 'HEADER' | 'FOOTER'
  nome text not null,
  tags text[] not null default '{}',
  html text not null default '',
  height_px int not null default 120, -- altura fisica do bloco
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_layout_templates_tipo_chk') then
    alter table public.documentos_layout_templates
      add constraint documentos_layout_templates_tipo_chk
      check (tipo in ('HEADER', 'FOOTER'));
  end if;
end $$;

create index if not exists documentos_layout_templates_tipo_idx
  on public.documentos_layout_templates(tipo);

create index if not exists documentos_layout_templates_ativo_idx
  on public.documentos_layout_templates(ativo);

create index if not exists documentos_layout_templates_tags_gin
  on public.documentos_layout_templates using gin(tags);

commit;
select pg_notify('pgrst', 'reload schema');
