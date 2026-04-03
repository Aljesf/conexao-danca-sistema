begin;

create table if not exists public.secretaria_caixa_pagamentos (
  id bigserial primary key,
  alvo_tipo text not null,
  alvo_id bigint not null,
  conta_interna_id bigint not null references public.credito_conexao_contas(id) on delete restrict,
  fatura_id bigint null references public.credito_conexao_faturas(id) on delete set null,
  lancamento_id bigint null references public.credito_conexao_lancamentos(id) on delete set null,
  valor_informado_centavos integer not null,
  forma_pagamento_codigo text not null,
  conta_financeira_id bigint null references public.contas_financeiras(id) on delete set null,
  centro_custo_id integer null references public.centros_custo(id) on delete set null,
  data_pagamento timestamptz not null,
  observacao text null,
  operador_user_id uuid null references auth.users(id) on delete set null,
  integracao_externa_status text not null default 'NAO_AVALIADA',
  integracao_externa_payload jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint secretaria_caixa_pagamentos_alvo_tipo_chk
    check (alvo_tipo in ('FATURA', 'LANCAMENTO')),
  constraint secretaria_caixa_pagamentos_valor_informado_chk
    check (valor_informado_centavos > 0),
  constraint secretaria_caixa_pagamentos_integracao_externa_status_chk
    check (
      integracao_externa_status in (
        'NAO_AVALIADA',
        'PENDENTE',
        'SINCRONIZADA',
        'REVISAO_MANUAL',
        'IGNORADA',
        'ERRO'
      )
    ),
  constraint secretaria_caixa_pagamentos_alvo_consistencia_chk
    check (
      (
        alvo_tipo = 'FATURA'
        and fatura_id is not null
        and alvo_id = fatura_id
        and lancamento_id is null
      )
      or (
        alvo_tipo = 'LANCAMENTO'
        and lancamento_id is not null
        and alvo_id = lancamento_id
      )
    )
);

create index if not exists idx_secretaria_caixa_pagamentos_conta
  on public.secretaria_caixa_pagamentos (conta_interna_id, created_at desc);

create index if not exists idx_secretaria_caixa_pagamentos_fatura
  on public.secretaria_caixa_pagamentos (fatura_id, created_at desc)
  where fatura_id is not null;

create index if not exists idx_secretaria_caixa_pagamentos_lancamento
  on public.secretaria_caixa_pagamentos (lancamento_id, created_at desc)
  where lancamento_id is not null;

create index if not exists idx_secretaria_caixa_pagamentos_status_externo
  on public.secretaria_caixa_pagamentos (integracao_externa_status, created_at desc);

comment on table public.secretaria_caixa_pagamentos is
  'Cabecalho auditavel dos pagamentos presenciais do Caixa da Secretaria para conta interna.';

comment on column public.secretaria_caixa_pagamentos.alvo_tipo is
  'Alvo operacional solicitado no balcao: FATURA ou LANCAMENTO.';

comment on column public.secretaria_caixa_pagamentos.alvo_id is
  'Identificador do alvo operacional informado pelo usuario no Caixa da Secretaria.';

comment on column public.secretaria_caixa_pagamentos.forma_pagamento_codigo is
  'Codigo de forma de pagamento compatibilizado com o cadastro central financeiro.';

comment on column public.secretaria_caixa_pagamentos.integracao_externa_status is
  'Resultado da tentativa de ajuste da cobranca externa vinculada apos o recebimento local.';

alter table public.recebimentos
  add column if not exists secretaria_caixa_pagamento_id bigint null references public.secretaria_caixa_pagamentos(id) on delete set null,
  add column if not exists conta_financeira_id bigint null references public.contas_financeiras(id) on delete set null,
  add column if not exists usuario_id uuid null references auth.users(id) on delete set null;

create index if not exists idx_recebimentos_secretaria_caixa_pagamento_id
  on public.recebimentos (secretaria_caixa_pagamento_id)
  where secretaria_caixa_pagamento_id is not null;

create index if not exists idx_recebimentos_conta_financeira_id
  on public.recebimentos (conta_financeira_id)
  where conta_financeira_id is not null;

create index if not exists idx_recebimentos_usuario_id
  on public.recebimentos (usuario_id)
  where usuario_id is not null;

comment on column public.recebimentos.secretaria_caixa_pagamento_id is
  'Cabecalho auditavel do pagamento presencial da Secretaria que originou este recebimento.';

comment on column public.recebimentos.conta_financeira_id is
  'Conta financeira informada no ato do recebimento presencial.';

comment on column public.recebimentos.usuario_id is
  'Operador autenticado que registrou o recebimento.';

create or replace function public.fn_secretaria_caixa_atualizar_status_cobranca(
  p_cobranca_id bigint,
  p_forma_pagamento_codigo text,
  p_data_pagamento timestamptz
)
returns void
language plpgsql
as $$
declare
  v_valor_original integer := 0;
  v_valor_pago integer := 0;
begin
  if p_cobranca_id is null then
    return;
  end if;

  select
    coalesce(c.valor_centavos, 0),
    coalesce(sum(r.valor_centavos), 0)::integer
    into v_valor_original, v_valor_pago
  from public.cobrancas c
  left join public.recebimentos r
    on r.cobranca_id = c.id
  where c.id = p_cobranca_id
  group by c.id, c.valor_centavos;

  update public.cobrancas
     set status = case
           when v_valor_pago >= coalesce(valor_centavos, 0) and coalesce(valor_centavos, 0) > 0 then 'PAGO'
           when upper(coalesce(status, '')) in ('CANCELADA', 'CANCELADO') then status
           else status
         end,
         data_pagamento = case
           when v_valor_pago >= coalesce(valor_centavos, 0) and coalesce(valor_centavos, 0) > 0 then p_data_pagamento
           else data_pagamento
         end,
         metodo_pagamento = case
           when v_valor_pago >= coalesce(valor_centavos, 0) and coalesce(valor_centavos, 0) > 0
             then coalesce(nullif(trim(p_forma_pagamento_codigo), ''), metodo_pagamento)
           else metodo_pagamento
         end,
         updated_at = now()
   where id = p_cobranca_id;
end;
$$;

create or replace function public.fn_secretaria_caixa_atualizar_status_fatura(
  p_fatura_id bigint
)
returns void
language plpgsql
as $$
declare
  v_total integer := 0;
  v_pago integer := 0;
  v_data_vencimento date;
  v_status text := 'ABERTA';
begin
  if p_fatura_id is null then
    return;
  end if;

  select
    coalesce(sum(l.valor_centavos), 0)::integer as total_original,
    coalesce(sum(coalesce(rec.total_pago_centavos, 0)), 0)::integer as total_pago,
    max(f.data_vencimento) as data_vencimento
    into v_total, v_pago, v_data_vencimento
  from public.credito_conexao_faturas f
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.fatura_id = f.id
  left join public.credito_conexao_lancamentos l
    on l.id = fl.lancamento_id
   and upper(coalesce(l.status, '')) not in ('CANCELADO', 'CANCELADA', 'INATIVO', 'INATIVA')
  left join (
    select
      r.cobranca_id,
      coalesce(sum(r.valor_centavos), 0)::integer as total_pago_centavos
    from public.recebimentos r
    where r.cobranca_id is not null
    group by r.cobranca_id
  ) rec
    on rec.cobranca_id = l.cobranca_id
  where f.id = p_fatura_id
  group by f.id;

  if v_total > 0 and v_pago >= v_total then
    v_status := 'PAGA';
  elsif v_data_vencimento is not null and v_data_vencimento < current_date then
    v_status := 'EM_ATRASO';
  else
    v_status := 'ABERTA';
  end if;

  update public.credito_conexao_faturas
     set status = case
           when upper(coalesce(status, '')) = 'CANCELADA' then status
           else v_status
         end,
         updated_at = now()
   where id = p_fatura_id;
end;
$$;

create or replace function public.fn_secretaria_caixa_aplicar_pagamento(
  p_alvo_tipo text,
  p_alvo_id bigint,
  p_valor_pagamento_centavos integer,
  p_forma_pagamento_codigo text,
  p_conta_financeira_id bigint,
  p_data_pagamento timestamptz,
  p_observacao text default null,
  p_operador_user_id uuid default null
)
returns table (
  pagamento_id bigint,
  conta_interna_id bigint,
  fatura_id bigint,
  lancamento_id bigint,
  valor_informado_centavos integer,
  valor_aplicado_centavos integer,
  quantidade_recebimentos integer
)
language plpgsql
as $$
declare
  v_alvo_tipo text := upper(trim(coalesce(p_alvo_tipo, '')));
  v_data_pagamento timestamptz := coalesce(p_data_pagamento, now());
  v_observacao text := nullif(trim(coalesce(p_observacao, '')), '');
  v_pagamento_id bigint;
  v_conta_interna_id bigint;
  v_fatura_id bigint;
  v_lancamento_id bigint;
  v_centro_custo_header integer;
  v_valor_restante integer := coalesce(p_valor_pagamento_centavos, 0);
  v_valor_aplicado integer := 0;
  v_quantidade_recebimentos integer := 0;
  v_cobranca_id bigint;
  v_centro_custo_id integer;
  v_saldo_lancamento integer;
  v_recebimento_id bigint;
  v_recebido_centavos integer;
  v_tem_lancamento_sem_cobranca boolean := false;
  r_lancamento record;
begin
  if v_alvo_tipo not in ('FATURA', 'LANCAMENTO') then
    raise exception using
      errcode = '22023',
      message = format('Alvo invalido para Caixa da Secretaria: %s', coalesce(p_alvo_tipo, '(null)'));
  end if;

  if p_valor_pagamento_centavos is null or p_valor_pagamento_centavos <= 0 then
    raise exception using
      errcode = '22023',
      message = 'valor_pagamento_centavos deve ser maior que zero.';
  end if;

  if nullif(trim(coalesce(p_forma_pagamento_codigo, '')), '') is null then
    raise exception using
      errcode = '22023',
      message = 'forma_pagamento_codigo obrigatorio.';
  end if;

  if p_conta_financeira_id is null then
    raise exception using
      errcode = '22023',
      message = 'conta_financeira_id obrigatoria.';
  end if;

  if not exists (
    select 1
    from public.contas_financeiras cf
    where cf.id = p_conta_financeira_id
  ) then
    raise exception using
      errcode = '23503',
      message = format('conta_financeira_id %s nao encontrada.', p_conta_financeira_id);
  end if;

  if v_alvo_tipo = 'FATURA' then
    select
      f.id,
      f.conta_conexao_id,
      cc.centro_custo_principal_id
      into v_fatura_id, v_conta_interna_id, v_centro_custo_header
    from public.credito_conexao_faturas f
    join public.credito_conexao_contas cc
      on cc.id = f.conta_conexao_id
    where f.id = p_alvo_id;

    if v_fatura_id is null or v_conta_interna_id is null then
      raise exception using
        errcode = '23503',
        message = format('Fatura %s nao encontrada para Caixa da Secretaria.', p_alvo_id);
    end if;

    select exists (
      select 1
      from public.credito_conexao_fatura_lancamentos fl
      join public.credito_conexao_lancamentos l
        on l.id = fl.lancamento_id
      where fl.fatura_id = v_fatura_id
        and upper(coalesce(l.status, '')) not in ('CANCELADO', 'CANCELADA', 'INATIVO', 'INATIVA')
        and l.cobranca_id is null
    ) into v_tem_lancamento_sem_cobranca;

    if v_tem_lancamento_sem_cobranca then
      raise exception using
        errcode = '23514',
        message = 'Fatura possui lancamento ativo sem cobranca canonica vinculada.';
    end if;

    insert into public.secretaria_caixa_pagamentos (
      alvo_tipo,
      alvo_id,
      conta_interna_id,
      fatura_id,
      valor_informado_centavos,
      forma_pagamento_codigo,
      conta_financeira_id,
      centro_custo_id,
      data_pagamento,
      observacao,
      operador_user_id,
      integracao_externa_status,
      created_at,
      updated_at
    )
    values (
      'FATURA',
      v_fatura_id,
      v_conta_interna_id,
      v_fatura_id,
      p_valor_pagamento_centavos,
      trim(p_forma_pagamento_codigo),
      p_conta_financeira_id,
      v_centro_custo_header,
      v_data_pagamento,
      v_observacao,
      p_operador_user_id,
      'PENDENTE',
      now(),
      now()
    )
    returning id into v_pagamento_id;

    for r_lancamento in
      with recebimentos_por_cobranca as (
        select
          r.cobranca_id,
          coalesce(sum(r.valor_centavos), 0)::integer as total_pago_centavos
        from public.recebimentos r
        where r.cobranca_id is not null
        group by r.cobranca_id
      )
      select
        l.id as lancamento_id,
        l.cobranca_id,
        coalesce(l.centro_custo_id, c.centro_custo_id, cc.centro_custo_principal_id) as centro_custo_id,
        greatest(
          coalesce(l.valor_centavos, 0) - coalesce(rec.total_pago_centavos, 0),
          0
        )::integer as saldo_aberto_centavos
      from public.credito_conexao_fatura_lancamentos fl
      join public.credito_conexao_lancamentos l
        on l.id = fl.lancamento_id
      join public.credito_conexao_contas cc
        on cc.id = l.conta_conexao_id
      left join public.cobrancas c
        on c.id = l.cobranca_id
      left join recebimentos_por_cobranca rec
        on rec.cobranca_id = l.cobranca_id
      where fl.fatura_id = v_fatura_id
        and upper(coalesce(l.status, '')) not in ('CANCELADO', 'CANCELADA', 'INATIVO', 'INATIVA')
        and l.cobranca_id is not null
      order by l.data_lancamento asc nulls first, l.id asc
    loop
      exit when v_valor_restante <= 0;

      v_recebido_centavos := least(v_valor_restante, coalesce(r_lancamento.saldo_aberto_centavos, 0));

      if v_recebido_centavos <= 0 then
        continue;
      end if;

      insert into public.recebimentos (
        cobranca_id,
        centro_custo_id,
        valor_centavos,
        data_pagamento,
        metodo_pagamento,
        forma_pagamento_codigo,
        origem_sistema,
        observacoes,
        secretaria_caixa_pagamento_id,
        conta_financeira_id,
        usuario_id,
        created_at
      )
      values (
        r_lancamento.cobranca_id,
        r_lancamento.centro_custo_id,
        v_recebido_centavos,
        v_data_pagamento,
        trim(p_forma_pagamento_codigo),
        trim(p_forma_pagamento_codigo),
        'SECRETARIA_CAIXA',
        v_observacao,
        v_pagamento_id,
        p_conta_financeira_id,
        p_operador_user_id,
        now()
      )
      returning id into v_recebimento_id;

      if r_lancamento.centro_custo_id is not null then
        insert into public.movimento_financeiro (
          tipo,
          centro_custo_id,
          valor_centavos,
          data_movimento,
          origem,
          origem_id,
          descricao,
          usuario_id,
          created_at
        )
        values (
          'RECEITA',
          r_lancamento.centro_custo_id,
          v_recebido_centavos,
          v_data_pagamento,
          'RECEBIMENTO',
          v_recebimento_id,
          format('Secretaria - pagamento fatura #%s', v_fatura_id),
          p_operador_user_id,
          now()
        );
      end if;

      perform public.fn_secretaria_caixa_atualizar_status_cobranca(
        r_lancamento.cobranca_id,
        trim(p_forma_pagamento_codigo),
        v_data_pagamento
      );

      v_valor_restante := v_valor_restante - v_recebido_centavos;
      v_valor_aplicado := v_valor_aplicado + v_recebido_centavos;
      v_quantidade_recebimentos := v_quantidade_recebimentos + 1;
    end loop;

    if v_valor_restante <> 0 then
      raise exception using
        errcode = '22003',
        message = format('Valor informado excede saldo aberto da fatura %s.', v_fatura_id);
    end if;

    perform public.fn_secretaria_caixa_atualizar_status_fatura(v_fatura_id);

    return query
    select
      v_pagamento_id,
      v_conta_interna_id,
      v_fatura_id,
      null::bigint,
      p_valor_pagamento_centavos,
      v_valor_aplicado,
      v_quantidade_recebimentos;

    return;
  end if;

  select
    l.id,
    l.conta_conexao_id,
    fl.fatura_id,
    l.cobranca_id,
    coalesce(l.centro_custo_id, c.centro_custo_id, cc.centro_custo_principal_id) as centro_custo_id,
    greatest(
      coalesce(l.valor_centavos, 0) - coalesce(sum(r.valor_centavos), 0),
      0
    )::integer as saldo_aberto_centavos,
    cc.centro_custo_principal_id
    into
      v_lancamento_id,
      v_conta_interna_id,
      v_fatura_id,
      v_cobranca_id,
      v_centro_custo_id,
      v_saldo_lancamento,
      v_centro_custo_header
  from public.credito_conexao_lancamentos l
  join public.credito_conexao_contas cc
    on cc.id = l.conta_conexao_id
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.lancamento_id = l.id
  left join public.cobrancas c
    on c.id = l.cobranca_id
  left join public.recebimentos r
    on r.cobranca_id = l.cobranca_id
  where l.id = p_alvo_id
    and upper(coalesce(l.status, '')) not in ('CANCELADO', 'CANCELADA', 'INATIVO', 'INATIVA')
  group by
    l.id,
    l.conta_conexao_id,
    fl.fatura_id,
    l.cobranca_id,
    l.centro_custo_id,
    c.centro_custo_id,
    cc.centro_custo_principal_id,
    l.valor_centavos;

  if v_lancamento_id is null or v_conta_interna_id is null then
    raise exception using
      errcode = '23503',
      message = format('Lancamento %s nao encontrado para Caixa da Secretaria.', p_alvo_id);
  end if;

  if v_cobranca_id is null then
    raise exception using
      errcode = '23514',
      message = format('Lancamento %s nao possui cobranca canonica vinculada.', v_lancamento_id);
  end if;

  if p_valor_pagamento_centavos > coalesce(v_saldo_lancamento, 0) then
    raise exception using
      errcode = '22003',
      message = format('Valor informado excede saldo aberto do lancamento %s.', v_lancamento_id);
  end if;

  insert into public.secretaria_caixa_pagamentos (
    alvo_tipo,
    alvo_id,
    conta_interna_id,
    fatura_id,
    lancamento_id,
    valor_informado_centavos,
    forma_pagamento_codigo,
    conta_financeira_id,
    centro_custo_id,
    data_pagamento,
    observacao,
    operador_user_id,
    integracao_externa_status,
    created_at,
    updated_at
  )
  values (
    'LANCAMENTO',
    v_lancamento_id,
    v_conta_interna_id,
    v_fatura_id,
    v_lancamento_id,
    p_valor_pagamento_centavos,
    trim(p_forma_pagamento_codigo),
    p_conta_financeira_id,
    coalesce(v_centro_custo_id, v_centro_custo_header),
    v_data_pagamento,
    v_observacao,
    p_operador_user_id,
    'PENDENTE',
    now(),
    now()
  )
  returning id into v_pagamento_id;

  insert into public.recebimentos (
    cobranca_id,
    centro_custo_id,
    valor_centavos,
    data_pagamento,
    metodo_pagamento,
    forma_pagamento_codigo,
    origem_sistema,
    observacoes,
    secretaria_caixa_pagamento_id,
    conta_financeira_id,
    usuario_id,
    created_at
  )
  values (
    v_cobranca_id,
    coalesce(v_centro_custo_id, v_centro_custo_header),
    p_valor_pagamento_centavos,
    v_data_pagamento,
    trim(p_forma_pagamento_codigo),
    trim(p_forma_pagamento_codigo),
    'SECRETARIA_CAIXA',
    v_observacao,
    v_pagamento_id,
    p_conta_financeira_id,
    p_operador_user_id,
    now()
  )
  returning id into v_recebimento_id;

  if coalesce(v_centro_custo_id, v_centro_custo_header) is not null then
    insert into public.movimento_financeiro (
      tipo,
      centro_custo_id,
      valor_centavos,
      data_movimento,
      origem,
      origem_id,
      descricao,
      usuario_id,
      created_at
    )
    values (
      'RECEITA',
      coalesce(v_centro_custo_id, v_centro_custo_header),
      p_valor_pagamento_centavos,
      v_data_pagamento,
      'RECEBIMENTO',
      v_recebimento_id,
      format('Secretaria - pagamento lancamento #%s', v_lancamento_id),
      p_operador_user_id,
      now()
    );
  end if;

  perform public.fn_secretaria_caixa_atualizar_status_cobranca(
    v_cobranca_id,
    trim(p_forma_pagamento_codigo),
    v_data_pagamento
  );

  if v_fatura_id is not null then
    perform public.fn_secretaria_caixa_atualizar_status_fatura(v_fatura_id);
  end if;

  return query
  select
    v_pagamento_id,
    v_conta_interna_id,
    v_fatura_id,
    v_lancamento_id,
    p_valor_pagamento_centavos,
    p_valor_pagamento_centavos,
    1;
end;
$$;

comment on function public.fn_secretaria_caixa_aplicar_pagamento(
  text,
  bigint,
  integer,
  text,
  bigint,
  timestamptz,
  text,
  uuid
) is
  'Aplica pagamento presencial da Secretaria em FATURA ou LANCAMENTO, com distribuicao segura e auditavel.';

commit;
