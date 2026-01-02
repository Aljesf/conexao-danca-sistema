begin;

do $$
begin
  if to_regclass('public.contratos_modelo') is not null and to_regclass('public.documentos_modelo') is null then
    alter table public.contratos_modelo rename to documentos_modelo;
  end if;

  if to_regclass('public.contratos_emitidos') is not null and to_regclass('public.documentos_emitidos') is null then
    alter table public.contratos_emitidos rename to documentos_emitidos;
  end if;

  if to_regclass('public.contratos_emitidos_termos') is not null and to_regclass('public.documentos_emitidos_termos') is null then
    alter table public.contratos_emitidos_termos rename to documentos_emitidos_termos;
  end if;

  if to_regclass('public.contratos_variaveis') is not null and to_regclass('public.documentos_variaveis') is null then
    alter table public.contratos_variaveis rename to documentos_variaveis;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'contratos_set_updated_at'
  ) and not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'documentos_set_updated_at'
  ) then
    alter function public.contratos_set_updated_at() rename to documentos_set_updated_at;
  end if;
end $$;

do $$
begin
  if to_regclass('public.documentos_modelo') is not null then
    drop trigger if exists trg_contratos_modelo_updated_at on public.documentos_modelo;
    drop trigger if exists trg_documentos_modelo_updated_at on public.documentos_modelo;

    create trigger trg_documentos_modelo_updated_at
      before update on public.documentos_modelo
      for each row execute function public.documentos_set_updated_at();
  end if;

  if to_regclass('public.documentos_emitidos') is not null then
    drop trigger if exists trg_contratos_emitidos_updated_at on public.documentos_emitidos;
    drop trigger if exists trg_documentos_emitidos_updated_at on public.documentos_emitidos;

    create trigger trg_documentos_emitidos_updated_at
      before update on public.documentos_emitidos
      for each row execute function public.documentos_set_updated_at();
  end if;

  if to_regclass('public.documentos_variaveis') is not null then
    drop trigger if exists trg_contratos_variaveis_updated_at on public.documentos_variaveis;
    drop trigger if exists trg_documentos_variaveis_updated_at on public.documentos_variaveis;

    create trigger trg_documentos_variaveis_updated_at
      before update on public.documentos_variaveis
      for each row execute function public.documentos_set_updated_at();
  end if;
end $$;

do $$
begin
  if to_regclass('public.matriculas') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'contrato_modelo_id'
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'documento_modelo_id'
    ) then
      alter table public.matriculas rename column contrato_modelo_id to documento_modelo_id;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'contrato_emitido_id'
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'documento_emitido_id'
    ) then
      alter table public.matriculas rename column contrato_emitido_id to documento_emitido_id;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'contrato_pdf_url'
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matriculas'
        and column_name = 'documento_pdf_url'
    ) then
      alter table public.matriculas rename column contrato_pdf_url to documento_pdf_url;
    end if;
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
