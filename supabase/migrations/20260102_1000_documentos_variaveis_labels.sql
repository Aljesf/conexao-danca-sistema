begin;

-- Mantem a logica por join_path, mas adiciona uma camada humana.
alter table public.documentos_variaveis
  add column if not exists display_label text;

-- Opcional: guardar labels por etapa (root/hops/target) para auditoria e UX
alter table public.documentos_variaveis
  add column if not exists path_labels jsonb;

commit;

select pg_notify('pgrst', 'reload schema');
