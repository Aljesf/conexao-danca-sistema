begin;

alter table public.documentos_emitidos
  add column if not exists conteudo_template_html text;

alter table public.documentos_emitidos
  add column if not exists conteudo_resolvido_html text;

alter table public.documentos_emitidos
  add column if not exists contexto_json jsonb;

commit;

select pg_notify('pgrst', 'reload schema');
