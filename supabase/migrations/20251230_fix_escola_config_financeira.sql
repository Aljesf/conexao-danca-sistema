-- Tabela singleton para configuracoes financeiras da escola

create table if not exists public.escola_config_financeira (
  id integer primary key check (id = 1),
  centro_custo_padrao_escola_id bigint
    references public.centros_custo(id) on delete set null,
  centro_custo_intermediacao_financeira_id bigint
    references public.centros_custo(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante que sempre exista exatamente 1 linha
insert into public.escola_config_financeira (id)
select 1
where not exists (
  select 1 from public.escola_config_financeira where id = 1
);

select pg_notify('pgrst', 'reload schema');
