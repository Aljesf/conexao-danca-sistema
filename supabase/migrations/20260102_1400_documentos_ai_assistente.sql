begin;

alter table public.documentos_variaveis
  add column if not exists ai_gerada boolean not null default false;

alter table public.documentos_variaveis
  add column if not exists mapeamento_pendente boolean not null default false;

alter table public.documentos_modelo
  add column if not exists ai_source_text text;

alter table public.documentos_modelo
  add column if not exists ai_sugestoes_json jsonb;

alter table public.documentos_modelo
  add column if not exists ai_updated_at timestamptz;

commit;

select pg_notify('pgrst', 'reload schema');
