begin;

-- 1. Tabela: pessoa_responsavel_financeiro_vinculos
create table if not exists public.pessoa_responsavel_financeiro_vinculos (
  id bigserial primary key,
  responsavel_pessoa_id bigint not null references public.pessoas(id) on delete cascade,
  dependente_pessoa_id bigint not null references public.pessoas(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (responsavel_pessoa_id, dependente_pessoa_id)
);

alter table public.pessoa_responsavel_financeiro_vinculos
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_prfv_responsavel
  on public.pessoa_responsavel_financeiro_vinculos (responsavel_pessoa_id)
  where ativo = true;

create index if not exists idx_prfv_dependente
  on public.pessoa_responsavel_financeiro_vinculos (dependente_pessoa_id)
  where ativo = true;

-- 2. Tabela: secretaria_caixa_pagamentos
create table if not exists public.secretaria_caixa_pagamentos (
  id bigserial primary key,
  alvo_tipo text not null check (alvo_tipo in ('FATURA', 'LANCAMENTO')),
  alvo_id bigint not null,
  conta_interna_id bigint not null references public.credito_conexao_contas(id),
  fatura_id bigint null references public.credito_conexao_faturas(id),
  lancamento_id bigint null references public.credito_conexao_lancamentos(id),
  valor_informado_centavos integer not null check (valor_informado_centavos > 0),
  forma_pagamento_codigo text not null,
  conta_financeira_id bigint null references public.contas_financeiras(id),
  data_pagamento date not null,
  observacao text null,
  operador_user_id uuid null references auth.users(id),
  integracao_externa_status text not null default 'NAO_AVALIADA',
  integracao_externa_payload jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_secretaria_caixa_pagamentos_conta
  on public.secretaria_caixa_pagamentos (conta_interna_id);

create index if not exists idx_secretaria_caixa_pagamentos_fatura
  on public.secretaria_caixa_pagamentos (fatura_id)
  where fatura_id is not null;

create index if not exists idx_secretaria_caixa_pagamentos_lancamento
  on public.secretaria_caixa_pagamentos (lancamento_id)
  where lancamento_id is not null;

-- 3. Coluna nova em recebimentos
alter table public.recebimentos
  add column if not exists secretaria_caixa_pagamento_id bigint null
    references public.secretaria_caixa_pagamentos(id) on delete set null;

create index if not exists idx_recebimentos_secretaria_caixa_pagamento_id
  on public.recebimentos (secretaria_caixa_pagamento_id)
  where secretaria_caixa_pagamento_id is not null;

-- Compatibilidade: a RPC abaixo atualiza credito_conexao_lancamentos.status para PAGO.
alter table public.credito_conexao_lancamentos
  drop constraint if exists credito_conexao_lancamentos_status_chk;

alter table public.credito_conexao_lancamentos
  add constraint credito_conexao_lancamentos_status_chk
  check (status in ('PENDENTE_FATURA', 'FATURADO', 'PAGO', 'CANCELADO'));

drop function if exists public.fn_secretaria_caixa_aplicar_pagamento(
  text,
  bigint,
  integer,
  text,
  bigint,
  timestamptz,
  text,
  uuid
);

drop function if exists public.fn_secretaria_caixa_aplicar_pagamento(
  text,
  bigint,
  integer,
  text,
  bigint,
  date,
  text,
  uuid
);

drop function if exists public.fn_secretaria_caixa_aplicar_pagamento(
  text,
  integer,
  integer,
  text,
  integer,
  date,
  text,
  uuid
);

-- 4. Funcao RPC: fn_secretaria_caixa_aplicar_pagamento
create or replace function public.fn_secretaria_caixa_aplicar_pagamento(
  p_alvo_tipo text,
  p_alvo_id bigint,
  p_valor_pagamento_centavos integer,
  p_forma_pagamento_codigo text,
  p_conta_financeira_id bigint,
  p_data_pagamento date,
  p_observacao text,
  p_operador_user_id uuid
)
returns table (
  pagamento_id bigint,
  conta_interna_id bigint,
  fatura_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alvo_tipo text := upper(trim(coalesce(p_alvo_tipo, '')));
  v_forma_pagamento_codigo text := nullif(trim(coalesce(p_forma_pagamento_codigo, '')), '');
  v_pagamento_id bigint;
  v_conta_interna_id bigint;
  v_fatura_id bigint;
  v_lancamento_id bigint;
  v_cobranca_id bigint;
  v_pessoa_titular_id bigint;
  v_centro_custo_id integer;
  v_valor_original integer := 0;
  v_valor_pago integer := 0;
  v_saldo_aberto integer := 0;
  v_total_pago integer := 0;
  v_descricao text;
  v_vencimento date;
  v_recebimento_id bigint;
begin
  if v_alvo_tipo not in ('FATURA', 'LANCAMENTO') then
    raise exception 'alvo_tipo invalido: %', coalesce(p_alvo_tipo, '(null)');
  end if;

  if coalesce(p_valor_pagamento_centavos, 0) <= 0 then
    raise exception 'valor_pagamento_centavos deve ser maior que zero';
  end if;

  if v_forma_pagamento_codigo is null then
    raise exception 'forma_pagamento_codigo obrigatorio';
  end if;

  if p_data_pagamento is null then
    raise exception 'data_pagamento obrigatoria';
  end if;

  if v_alvo_tipo = 'FATURA' then
    select
      cc.id,
      f.id,
      f.cobranca_id,
      cc.pessoa_titular_id,
      cc.centro_custo_principal_id,
      coalesce(f.valor_total_centavos, 0),
      f.data_vencimento
    into
      v_conta_interna_id,
      v_fatura_id,
      v_cobranca_id,
      v_pessoa_titular_id,
      v_centro_custo_id,
      v_valor_original,
      v_vencimento
    from public.credito_conexao_faturas f
    join public.credito_conexao_contas cc
      on cc.id = f.conta_conexao_id
    where f.id = p_alvo_id;

    if v_fatura_id is null then
      raise exception 'fatura nao encontrada: %', p_alvo_id;
    end if;

    v_lancamento_id := null;
    v_descricao := format('Pagamento Secretaria Caixa - Fatura #%s', v_fatura_id);
  else
    select
      cc.id,
      fl.fatura_id,
      l.id,
      l.cobranca_id,
      cc.pessoa_titular_id,
      coalesce(l.centro_custo_id, cc.centro_custo_principal_id),
      coalesce(l.valor_centavos, 0),
      coalesce(nullif(trim(l.descricao), ''), format('Pagamento Secretaria Caixa - Lancamento #%s', l.id)),
      coalesce(f.data_vencimento, l.data_lancamento)
    into
      v_conta_interna_id,
      v_fatura_id,
      v_lancamento_id,
      v_cobranca_id,
      v_pessoa_titular_id,
      v_centro_custo_id,
      v_valor_original,
      v_descricao,
      v_vencimento
    from public.credito_conexao_lancamentos l
    join public.credito_conexao_contas cc
      on cc.id = l.conta_conexao_id
    left join public.credito_conexao_fatura_lancamentos fl
      on fl.lancamento_id = l.id
    left join public.credito_conexao_faturas f
      on f.id = fl.fatura_id
    where l.id = p_alvo_id;

    if v_lancamento_id is null then
      raise exception 'lancamento nao encontrado: %', p_alvo_id;
    end if;
  end if;

  if v_cobranca_id is not null then
    select coalesce(sum(r.valor_centavos), 0)::integer
      into v_valor_pago
    from public.recebimentos r
    where r.cobranca_id = v_cobranca_id;
  end if;

  v_saldo_aberto := greatest(v_valor_original - v_valor_pago, 0);

  if p_valor_pagamento_centavos > v_saldo_aberto then
    raise exception 'valor excede saldo em aberto';
  end if;

  if v_cobranca_id is null then
    insert into public.cobrancas (
      pessoa_id,
      descricao,
      valor_centavos,
      status,
      vencimento,
      origem_tipo,
      origem_id,
      metodo_pagamento,
      moeda,
      centro_custo_id
    )
    values (
      v_pessoa_titular_id,
      v_descricao,
      v_valor_original,
      'PENDENTE',
      coalesce(v_vencimento, p_data_pagamento),
      case
        when v_alvo_tipo = 'FATURA' then 'FATURA_CREDITO_CONEXAO'
        else 'LANCAMENTO_CREDITO_CONEXAO'
      end,
      p_alvo_id,
      v_forma_pagamento_codigo,
      'BRL',
      v_centro_custo_id
    )
    returning id into v_cobranca_id;

    if v_alvo_tipo = 'FATURA' then
      update public.credito_conexao_faturas
         set cobranca_id = v_cobranca_id,
             updated_at = now()
       where id = p_alvo_id;
    else
      update public.credito_conexao_lancamentos
         set cobranca_id = v_cobranca_id,
             updated_at = now()
       where id = p_alvo_id;
    end if;
  end if;

  insert into public.recebimentos (
    cobranca_id,
    valor_centavos,
    data_pagamento,
    metodo_pagamento,
    forma_pagamento_codigo,
    centro_custo_id,
    origem_sistema,
    observacoes
  )
  values (
    v_cobranca_id,
    p_valor_pagamento_centavos,
    p_data_pagamento,
    v_forma_pagamento_codigo,
    v_forma_pagamento_codigo,
    v_centro_custo_id,
    'SECRETARIA_CAIXA',
    p_observacao
  )
  returning id into v_recebimento_id;

  insert into public.secretaria_caixa_pagamentos (
    alvo_tipo,
    alvo_id,
    conta_interna_id,
    fatura_id,
    lancamento_id,
    valor_informado_centavos,
    forma_pagamento_codigo,
    conta_financeira_id,
    data_pagamento,
    observacao,
    operador_user_id,
    integracao_externa_status,
    integracao_externa_payload
  )
  values (
    v_alvo_tipo,
    p_alvo_id,
    v_conta_interna_id,
    v_fatura_id,
    v_lancamento_id,
    p_valor_pagamento_centavos,
    v_forma_pagamento_codigo,
    p_conta_financeira_id,
    p_data_pagamento,
    p_observacao,
    p_operador_user_id,
    'NAO_AVALIADA',
    null
  )
  returning id into v_pagamento_id;

  update public.recebimentos
     set secretaria_caixa_pagamento_id = v_pagamento_id
   where id = v_recebimento_id;

  select coalesce(sum(r.valor_centavos), 0)::integer
    into v_total_pago
  from public.recebimentos r
  where r.cobranca_id = v_cobranca_id;

  if v_total_pago >= v_valor_original then
    update public.cobrancas
       set status = 'PAGO',
           data_pagamento = p_data_pagamento,
           metodo_pagamento = coalesce(v_forma_pagamento_codigo, metodo_pagamento),
           updated_at = now()
     where id = v_cobranca_id;
  end if;

  if v_alvo_tipo = 'LANCAMENTO' and v_total_pago >= v_valor_original then
    update public.credito_conexao_lancamentos
       set status = 'PAGO',
           updated_at = now()
     where id = p_alvo_id;
  end if;

  if v_fatura_id is not null
     and exists (
       select 1
       from public.credito_conexao_fatura_lancamentos fl
       where fl.fatura_id = v_fatura_id
     )
     and not exists (
       select 1
       from public.credito_conexao_fatura_lancamentos fl
       join public.credito_conexao_lancamentos l
         on l.id = fl.lancamento_id
      where fl.fatura_id = v_fatura_id
        and upper(coalesce(l.status, '')) not in ('PAGO', 'CANCELADO')
     ) then
    update public.credito_conexao_faturas
       set status = 'PAGA',
           updated_at = now()
     where id = v_fatura_id;
  end if;

  return query
  select v_pagamento_id, v_conta_interna_id, v_fatura_id;
end;
$$;

commit;
