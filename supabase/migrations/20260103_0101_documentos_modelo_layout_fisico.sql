begin;

-- Modelo aponta para templates reutilizaveis
alter table public.documentos_modelo
  add column if not exists header_template_id bigint;

alter table public.documentos_modelo
  add column if not exists footer_template_id bigint;

-- Alturas fisicas do modelo (podem sobrescrever a altura do template)
alter table public.documentos_modelo
  add column if not exists header_height_px int not null default 120;

alter table public.documentos_modelo
  add column if not exists footer_height_px int not null default 80;

-- Margens de pagina para impressao (MVP)
alter table public.documentos_modelo
  add column if not exists page_margin_mm int not null default 15;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_modelo_header_template_fk') then
    alter table public.documentos_modelo
      add constraint documentos_modelo_header_template_fk
      foreign key (header_template_id)
      references public.documentos_layout_templates(layout_template_id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'documentos_modelo_footer_template_fk') then
    alter table public.documentos_modelo
      add constraint documentos_modelo_footer_template_fk
      foreign key (footer_template_id)
      references public.documentos_layout_templates(layout_template_id)
      on delete set null;
  end if;
end $$;

commit;
select pg_notify('pgrst', 'reload schema');
