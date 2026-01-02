begin;

alter table public.documentos_modelo
  add column if not exists formato text not null default 'MARKDOWN';

alter table public.documentos_modelo
  add column if not exists conteudo_html text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documentos_modelo_formato_chk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_formato_chk
      check (formato in ('MARKDOWN', 'RICH_HTML'));
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
