begin;

-- Remover coluna de classificacao antiga do modelo
alter table public.documentos_modelo
  drop column if exists tipo_contrato;

commit;

select pg_notify('pgrst', 'reload schema');
