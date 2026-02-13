begin;

-- Diagnostico do padrao financeiro atual no repo:
-- - Centro de custo canonico: public.centros_custo(id integer).
-- - Contas a pagar canonico: public.contas_pagar(id bigint), com status usados em API: PENDENTE/PARCIAL/PAGO/CANCELADO.
-- - Caixa operacional: public.movimento_financeiro (tipo/origem/centro_custo_id).

-- 1) Perfil de pagamento: vinculo ao centro de custo real do financeiro
alter table public.colaborador_config_financeira
  add column if not exists centro_custo_id integer null;

comment on column public.colaborador_config_financeira.centro_custo_id is
  'Centro de custo do colaborador (origem do pagamento: escola/loja/cafe etc.).';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colaborador_config_financeira_centro_custo_id_fkey'
  ) then
    alter table public.colaborador_config_financeira
      add constraint colaborador_config_financeira_centro_custo_id_fkey
      foreign key (centro_custo_id)
      references public.centros_custo(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_colab_cfg_fin_centro_custo
  on public.colaborador_config_financeira (centro_custo_id);

-- 2) Tabela auxiliar de recorrencia (nao havia equivalente especifico no dominio atual)
create table if not exists public.financeiro_recorrencias (
  id bigserial primary key,
  tipo text not null, -- FOLHA_COLABORADOR_MENSAL
  colaborador_id bigint not null references public.colaboradores(id) on delete cascade,
  centro_custo_id integer null references public.centros_custo(id) on delete set null,
  dia_pagamento integer not null default 5,
  pagamento_no_mes_seguinte boolean not null default true,
  valor_centavos integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_fin_rec_dia_pagamento check (dia_pagamento between 1 and 31),
  constraint chk_fin_rec_valor check (valor_centavos >= 0)
);

create unique index if not exists financeiro_recorrencias_uq
  on public.financeiro_recorrencias (tipo, colaborador_id);

create index if not exists idx_financeiro_recorrencias_centro_custo
  on public.financeiro_recorrencias (centro_custo_id);

create index if not exists idx_financeiro_recorrencias_ativo
  on public.financeiro_recorrencias (ativo);

drop trigger if exists trg_fin_rec_updated_at on public.financeiro_recorrencias;
create trigger trg_fin_rec_updated_at
before update on public.financeiro_recorrencias
for each row execute function public.set_updated_at();

-- 3) Registro idempotente de previsao por colaborador+competencia
create table if not exists public.folha_contas_pagar_referencias (
  id bigserial primary key,
  competencia text not null,
  folha_id bigint not null references public.folha_pagamento(id) on delete cascade,
  colaborador_id bigint not null references public.colaboradores(id) on delete cascade,
  conta_pagar_id bigint not null references public.contas_pagar(id) on delete cascade,
  centro_custo_id integer not null references public.centros_custo(id) on delete restrict,
  valor_centavos integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_folha_cp_competencia_fmt check (competencia ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint chk_folha_cp_valor check (valor_centavos >= 0)
);

create unique index if not exists ux_folha_cp_ref_comp_colab
  on public.folha_contas_pagar_referencias (competencia, colaborador_id);

create unique index if not exists ux_folha_cp_ref_folha_colab
  on public.folha_contas_pagar_referencias (folha_id, colaborador_id);

create unique index if not exists ux_folha_cp_ref_conta_pagar
  on public.folha_contas_pagar_referencias (conta_pagar_id);

create index if not exists idx_folha_cp_ref_folha
  on public.folha_contas_pagar_referencias (folha_id);

create index if not exists idx_folha_cp_ref_colaborador
  on public.folha_contas_pagar_referencias (colaborador_id);

drop trigger if exists trg_folha_cp_ref_updated_at on public.folha_contas_pagar_referencias;
create trigger trg_folha_cp_ref_updated_at
before update on public.folha_contas_pagar_referencias
for each row execute function public.set_updated_at();

-- 4) Indice de apoio por competencia (ja existe unique, mas mantemos nome dedicado para consulta)
create index if not exists idx_folha_competencia
  on public.folha_pagamento (competencia);

-- 5) Helpers para previsao de contas a pagar a partir da folha
create or replace function public._folha_item_eh_desconto(p_tipo_item text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_tipo_item, '') ilike 'DESCONTO%'
    or coalesce(p_tipo_item, '') in ('INSS', 'IRRF', 'FALTA', 'ATRASO', 'ADIANTAMENTO_SALARIAL');
$$;

create or replace function public.folha_sincronizar_recorrencias_colaboradores()
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  insert into public.financeiro_recorrencias (
    tipo,
    colaborador_id,
    centro_custo_id,
    dia_pagamento,
    pagamento_no_mes_seguinte,
    valor_centavos,
    ativo
  )
  select
    'FOLHA_COLABORADOR_MENSAL' as tipo,
    cfg.colaborador_id,
    coalesce(cfg.centro_custo_id, c.centro_custo_id) as centro_custo_id,
    cfg.dia_pagamento,
    cfg.pagamento_no_mes_seguinte,
    case
      when cfg.tipo_remuneracao = 'HORISTA' then cfg.valor_hora_centavos
      else cfg.salario_base_centavos
    end as valor_centavos,
    (cfg.ativo and c.ativo and cfg.gera_folha) as ativo
  from public.colaborador_config_financeira cfg
  join public.colaboradores c on c.id = cfg.colaborador_id
  on conflict (tipo, colaborador_id)
  do update set
    centro_custo_id = excluded.centro_custo_id,
    dia_pagamento = excluded.dia_pagamento,
    pagamento_no_mes_seguinte = excluded.pagamento_no_mes_seguinte,
    valor_centavos = excluded.valor_centavos,
    ativo = excluded.ativo,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.folha_gerar_previsao_contas_pagar(
  p_competencia text,
  p_reprocessar boolean default false
)
returns table(
  processados integer,
  criados integer,
  atualizados integer,
  ignorados integer
)
language plpgsql
as $$
declare
  v_folha_id bigint;
  v_ref_id bigint;
  v_conta_id bigint;
  v_status text;
  r record;
begin
  processados := 0;
  criados := 0;
  atualizados := 0;
  ignorados := 0;

  if p_competencia is null or p_competencia !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'p_competencia invalida. Use YYYY-MM.';
  end if;

  select id into v_folha_id
  from public.folha_pagamento
  where competencia = p_competencia
  limit 1;

  if v_folha_id is null then
    raise exception 'Folha nao encontrada para a competencia %.', p_competencia;
  end if;

  perform public.folha_sincronizar_recorrencias_colaboradores();

  for r in
    with totais as (
      select
        i.colaborador_id,
        sum(case when public._folha_item_eh_desconto(i.tipo_item) then 0 else i.valor_centavos end) as proventos_centavos,
        sum(case when public._folha_item_eh_desconto(i.tipo_item) then i.valor_centavos else 0 end) as descontos_centavos
      from public.folha_pagamento_itens i
      where i.folha_id = v_folha_id
      group by i.colaborador_id
    )
    select
      t.colaborador_id,
      greatest((t.proventos_centavos - t.descontos_centavos), 0)::integer as liquido_centavos,
      coalesce(cfg.centro_custo_id, c.centro_custo_id) as centro_custo_id,
      coalesce(cfg.dia_pagamento, 5) as dia_pagamento,
      coalesce(cfg.pagamento_no_mes_seguinte, true) as pagamento_no_mes_seguinte,
      c.pessoa_id,
      coalesce(p.nome, format('Colaborador #%s', t.colaborador_id)) as colaborador_nome
    from totais t
    join public.colaboradores c on c.id = t.colaborador_id
    left join public.colaborador_config_financeira cfg on cfg.colaborador_id = t.colaborador_id
    left join public.pessoas p on p.id = c.pessoa_id
    where greatest((t.proventos_centavos - t.descontos_centavos), 0) > 0
  loop
    processados := processados + 1;

    if r.centro_custo_id is null then
      ignorados := ignorados + 1;
      continue;
    end if;

    v_ref_id := null;
    v_conta_id := null;

    select ref.id, ref.conta_pagar_id
      into v_ref_id, v_conta_id
    from public.folha_contas_pagar_referencias ref
    where ref.competencia = p_competencia
      and ref.colaborador_id = r.colaborador_id
    limit 1;

    if v_ref_id is not null and not p_reprocessar then
      ignorados := ignorados + 1;
      continue;
    end if;

    if v_conta_id is not null then
      select cp.status
        into v_status
      from public.contas_pagar cp
      where cp.id = v_conta_id
      limit 1;

      if coalesce(v_status, '') in ('PAGO', 'CANCELADO') then
        ignorados := ignorados + 1;
        continue;
      end if;

      update public.contas_pagar
      set
        descricao = format('Folha colaborador %s (%s)', p_competencia, r.colaborador_nome),
        observacoes = format('Origem: FOLHA_COLABORADOR; competencia=%s; colaborador_id=%s', p_competencia, r.colaborador_id),
        valor_centavos = r.liquido_centavos,
        vencimento = public._calc_data_pagamento_prevista(p_competencia, r.dia_pagamento, r.pagamento_no_mes_seguinte),
        centro_custo_id = r.centro_custo_id,
        pessoa_id = r.pessoa_id,
        updated_at = now()
      where id = v_conta_id;

      update public.folha_contas_pagar_referencias
      set
        folha_id = v_folha_id,
        centro_custo_id = r.centro_custo_id,
        valor_centavos = r.liquido_centavos,
        updated_at = now()
      where id = v_ref_id;

      atualizados := atualizados + 1;
      continue;
    end if;

    insert into public.contas_pagar (
      centro_custo_id,
      categoria_id,
      pessoa_id,
      descricao,
      valor_centavos,
      vencimento,
      status,
      observacoes
    )
    values (
      r.centro_custo_id,
      null,
      r.pessoa_id,
      format('Folha colaborador %s (%s)', p_competencia, r.colaborador_nome),
      r.liquido_centavos,
      public._calc_data_pagamento_prevista(p_competencia, r.dia_pagamento, r.pagamento_no_mes_seguinte),
      'PENDENTE',
      format('Origem: FOLHA_COLABORADOR; competencia=%s; colaborador_id=%s', p_competencia, r.colaborador_id)
    )
    returning id into v_conta_id;

    insert into public.folha_contas_pagar_referencias (
      competencia,
      folha_id,
      colaborador_id,
      conta_pagar_id,
      centro_custo_id,
      valor_centavos
    )
    values (
      p_competencia,
      v_folha_id,
      r.colaborador_id,
      v_conta_id,
      r.centro_custo_id,
      r.liquido_centavos
    )
    on conflict (competencia, colaborador_id)
    do update set
      folha_id = excluded.folha_id,
      conta_pagar_id = excluded.conta_pagar_id,
      centro_custo_id = excluded.centro_custo_id,
      valor_centavos = excluded.valor_centavos,
      updated_at = now();

    criados := criados + 1;
  end loop;

  return next;
end;
$$;

commit;