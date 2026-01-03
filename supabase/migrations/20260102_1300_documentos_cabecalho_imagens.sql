begin;

alter table public.documentos_modelo
  add column if not exists cabecalho_html text;

alter table public.documentos_modelo
  add column if not exists rodape_html text;

alter table public.documentos_emitidos
  add column if not exists cabecalho_html text;

alter table public.documentos_emitidos
  add column if not exists rodape_html text;

commit;

select pg_notify('pgrst', 'reload schema');
