begin;

-- Correcao complementar para alinhar o schema operacional do cafe
-- com as rotas /api/cafe/caixa (GET/POST) em ambientes onde a
-- migration de 2026-03-16 ainda nao foi aplicada.

alter table if exists public.cafe_vendas
  add column if not exists data_operacao date not null default current_date,
  add column if not exists data_competencia text null,
  add column if not exists colaborador_pessoa_id bigint null,
  add column if not exists tipo_quitacao text not null default 'IMEDIATA',
  add column if not exists valor_pago_centavos integer not null default 0,
  add column if not exists valor_em_aberto_centavos integer not null default 0,
  add column if not exists observacoes_internas text null,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.cafe_vendas
  alter column status_pagamento set default 'PENDENTE';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cafe_vendas'
      and column_name = 'colaborador_pessoa_id'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_colaborador_pessoa_id_fkey'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_colaborador_pessoa_id_fkey
      foreign key (colaborador_pessoa_id)
      references public.pessoas(id)
      on delete set null;
  end if;
end $$;

update public.cafe_vendas
set
  data_operacao = coalesce(created_at::date, data_operacao, current_date),
  tipo_quitacao = case
    when upper(coalesce(forma_pagamento, '')) in ('CONTA_INTERNA_COLABORADOR', 'CARTAO_CONEXAO_COLABORADOR')
      then 'CONTA_INTERNA_COLABORADOR'
    when upper(coalesce(status_pagamento, '')) = 'PAGO'
      then 'IMEDIATA'
    else 'PARCIAL'
  end,
  data_competencia = case
    when upper(coalesce(forma_pagamento, '')) in ('CONTA_INTERNA_COLABORADOR', 'CARTAO_CONEXAO_COLABORADOR')
      then coalesce(data_competencia, to_char(coalesce(data_operacao, created_at::date, current_date), 'YYYY-MM'))
    else data_competencia
  end,
  valor_pago_centavos = case
    when upper(coalesce(status_pagamento, '')) = 'PAGO'
      then coalesce(valor_total_centavos, 0)
    else greatest(coalesce(valor_pago_centavos, 0), 0)
  end
where true;

update public.cafe_vendas
set valor_em_aberto_centavos = greatest(coalesce(valor_total_centavos, 0) - coalesce(valor_pago_centavos, 0), 0)
where true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_data_competencia_chk'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_data_competencia_chk
      check (
        data_competencia is null
        or data_competencia ~ '^[0-9]{4}-[0-9]{2}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_tipo_quitacao_chk'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_tipo_quitacao_chk
      check (
        tipo_quitacao in ('IMEDIATA', 'PARCIAL', 'CONTA_INTERNA_COLABORADOR')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_status_pagamento_chk'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_status_pagamento_chk
      check (
        status_pagamento in ('PENDENTE', 'PARCIAL', 'PAGO', 'FATURADO', 'CANCELADO')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_valores_chk'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_valores_chk
      check (
        valor_total_centavos >= 0
        and valor_pago_centavos >= 0
        and valor_pago_centavos <= valor_total_centavos
        and valor_em_aberto_centavos = greatest(valor_total_centavos - valor_pago_centavos, 0)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_vendas_conta_interna_chk'
      and conrelid = 'public.cafe_vendas'::regclass
  ) then
    alter table public.cafe_vendas
      add constraint cafe_vendas_conta_interna_chk
      check (
        tipo_quitacao <> 'CONTA_INTERNA_COLABORADOR'
        or (
          colaborador_pessoa_id is not null
          and data_competencia is not null
        )
      );
  end if;
end $$;

create index if not exists idx_cafe_vendas_data_operacao
  on public.cafe_vendas (data_operacao desc);

create index if not exists idx_cafe_vendas_colaborador_pessoa_id
  on public.cafe_vendas (colaborador_pessoa_id)
  where colaborador_pessoa_id is not null;

create index if not exists idx_cafe_vendas_data_competencia
  on public.cafe_vendas (data_competencia)
  where data_competencia is not null;

create index if not exists idx_cafe_vendas_cobranca_id
  on public.cafe_vendas (cobranca_id)
  where cobranca_id is not null;

alter table if exists public.cafe_venda_itens
  add column if not exists descricao_snapshot text null,
  add column if not exists valor_unitario_centavos integer not null default 0,
  add column if not exists valor_total_centavos integer not null default 0;

update public.cafe_venda_itens
set
  valor_unitario_centavos = coalesce(preco_unitario_centavos, valor_unitario_centavos, 0),
  valor_total_centavos = coalesce(total_centavos, valor_total_centavos, 0)
where true;

update public.cafe_venda_itens i
set descricao_snapshot = p.nome
from public.cafe_produtos p
where i.produto_id = p.id
  and i.descricao_snapshot is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_venda_itens_valores_chk'
      and conrelid = 'public.cafe_venda_itens'::regclass
  ) then
    alter table public.cafe_venda_itens
      add constraint cafe_venda_itens_valores_chk
      check (
        quantidade > 0
        and valor_unitario_centavos >= 0
        and valor_total_centavos >= 0
      );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'cafe_vendas'
        and t.tgname = 'trg_cafe_vendas_set_updated_at'
    ) then
      create trigger trg_cafe_vendas_set_updated_at
      before update on public.cafe_vendas
      for each row
      execute function public.set_updated_at();
    end if;
  end if;
end $$;

commit;
