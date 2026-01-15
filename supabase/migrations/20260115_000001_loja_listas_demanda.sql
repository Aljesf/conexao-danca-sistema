-- Listas Administrativas de Demanda (nao e compra, nao e fornecedor, nao e estoque, nao e financeiro)

begin;

-- 1) Enum de status (2 estados)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'loja_lista_demanda_status') then
    create type public.loja_lista_demanda_status as enum ('ATIVA', 'ENCERRADA');
  end if;
end $$;

-- 2) Tabela de listas (cabecalho)
create table if not exists public.loja_listas_demanda (
  id                bigserial primary key,
  titulo            text not null,
  contexto          text null,
  status            public.loja_lista_demanda_status not null default 'ATIVA',
  bloqueada         boolean not null default false,
  observacoes       text null,

  criado_em         timestamptz not null default now(),
  criado_por        uuid null,

  bloqueada_em      timestamptz null,
  bloqueada_por     uuid null,

  encerrada_em      timestamptz null,
  encerrada_por     uuid null
);

create index if not exists idx_loja_listas_demanda_status
  on public.loja_listas_demanda (status);

create index if not exists idx_loja_listas_demanda_bloqueada
  on public.loja_listas_demanda (bloqueada);

-- 3) Tabela de itens
create table if not exists public.loja_listas_demanda_itens (
  id                    bigserial primary key,
  lista_id              bigint not null references public.loja_listas_demanda(id) on delete cascade,

  produto_id            bigint null references public.loja_produtos(id) on delete set null,

  -- A variacao pode variar conforme seu schema real.
  produto_variacao_id   bigint null,

  descricao_livre       text null,

  quantidade            integer not null check (quantidade > 0),
  observacoes           text null,

  criado_em             timestamptz not null default now(),
  criado_por            uuid null,
  atualizado_em         timestamptz not null default now(),
  atualizado_por        uuid null
);

create index if not exists idx_loja_listas_demanda_itens_lista
  on public.loja_listas_demanda_itens (lista_id);

create index if not exists idx_loja_listas_demanda_itens_produto
  on public.loja_listas_demanda_itens (produto_id);

-- 4) FK condicional para variacoes (se existir tabela padrao de variantes)
do $$
declare
  variantes_table text;
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='loja_produto_variantes') then
    variantes_table := 'loja_produto_variantes';
  elsif exists (select 1 from information_schema.tables where table_schema='public' and table_name='loja_produtos_variantes') then
    variantes_table := 'loja_produtos_variantes';
  elsif exists (select 1 from information_schema.tables where table_schema='public' and table_name='loja_produto_variacoes') then
    variantes_table := 'loja_produto_variacoes';
  end if;

  if variantes_table is not null then
    if not exists (
      select 1
      from information_schema.table_constraints
      where constraint_schema='public'
        and table_name='loja_listas_demanda_itens'
        and constraint_name='fk_loja_listas_demanda_itens_variacao'
    ) then
      execute format(
        'alter table public.loja_listas_demanda_itens add constraint fk_loja_listas_demanda_itens_variacao foreign key (produto_variacao_id) references public.%I(id) on delete set null',
        variantes_table
      );
    end if;
  end if;
end $$;

-- 5) Regra de integridade do item: OU tem produto_id OU tem descricao_livre
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema='public'
      and table_name='loja_listas_demanda_itens'
      and constraint_name='chk_loja_lista_item_produto_ou_descricao'
  ) then
    alter table public.loja_listas_demanda_itens
      add constraint chk_loja_lista_item_produto_ou_descricao
      check (
        (produto_id is not null)
        or (descricao_livre is not null and btrim(descricao_livre) <> '')
      );
  end if;
end $$;

commit;
