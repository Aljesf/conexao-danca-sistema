begin;

alter table public.documentos_emitidos
  add column if not exists header_html text;

alter table public.documentos_emitidos
  add column if not exists footer_html text;

alter table public.documentos_emitidos
  add column if not exists header_height_px int not null default 120;

alter table public.documentos_emitidos
  add column if not exists footer_height_px int not null default 80;

alter table public.documentos_emitidos
  add column if not exists page_margin_mm int not null default 15;

commit;
select pg_notify('pgrst', 'reload schema');
