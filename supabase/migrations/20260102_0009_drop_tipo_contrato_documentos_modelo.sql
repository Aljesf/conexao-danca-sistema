begin;

-- Remove de vez a coluna legada que esta quebrando os seeds
alter table public.documentos_modelo
  drop column if exists tipo_contrato;

commit;

select pg_notify('pgrst', 'reload schema');
