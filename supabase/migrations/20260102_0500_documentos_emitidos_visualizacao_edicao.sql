begin;

alter table public.documentos_emitidos
  add column if not exists conteudo_html text;

alter table public.documentos_emitidos
  add column if not exists editado_manual boolean not null default false;

alter table public.documentos_emitidos
  add column if not exists updated_at timestamptz;

alter table public.documentos_emitidos
  add column if not exists pdf_url text;

commit;

select pg_notify('pgrst', 'reload schema');
