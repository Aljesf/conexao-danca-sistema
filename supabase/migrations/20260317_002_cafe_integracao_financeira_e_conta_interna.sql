begin;

alter table public.cafe_vendas
  add column if not exists centro_custo_id integer,
  add column if not exists conta_financeira_id bigint,
  add column if not exists forma_pagamento_id bigint,
  add column if not exists comprador_tipo text,
  add column if not exists comprador_pessoa_id bigint,
  add column if not exists conta_conexao_id bigint,
  add column if not exists recebimento_id bigint,
  add column if not exists movimento_financeiro_id bigint,
  add column if not exists origem_financeira text,
  add column if not exists status_financeiro text not null default 'PENDENTE',
  add column if not exists competencia_ano_mes text,
  add column if not exists observacao_financeira text;

do $$
begin
  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_centro_custo_id_fkey
      foreign key (centro_custo_id) references public.centros_custo(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_conta_financeira_id_fkey
      foreign key (conta_financeira_id) references public.contas_financeiras(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_forma_pagamento_id_fkey
      foreign key (forma_pagamento_id) references public.formas_pagamento(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_comprador_pessoa_id_fkey
      foreign key (comprador_pessoa_id) references public.pessoas(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_conta_conexao_id_fkey
      foreign key (conta_conexao_id) references public.credito_conexao_contas(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_cobranca_id_fkey
      foreign key (cobranca_id) references public.cobrancas(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_recebimento_id_fkey
      foreign key (recebimento_id) references public.recebimentos(id) on delete set null;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.cafe_vendas
      add constraint cafe_vendas_movimento_financeiro_id_fkey
      foreign key (movimento_financeiro_id) references public.movimento_financeiro(id) on delete set null;
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists idx_cafe_vendas_centro_custo_id
  on public.cafe_vendas (centro_custo_id);

create index if not exists idx_cafe_vendas_conta_financeira_id
  on public.cafe_vendas (conta_financeira_id);

create index if not exists idx_cafe_vendas_forma_pagamento_id
  on public.cafe_vendas (forma_pagamento_id);

create index if not exists idx_cafe_vendas_comprador_pessoa_id
  on public.cafe_vendas (comprador_pessoa_id);

create index if not exists idx_cafe_vendas_conta_conexao_id
  on public.cafe_vendas (conta_conexao_id);

create index if not exists idx_cafe_vendas_recebimento_id
  on public.cafe_vendas (recebimento_id);

create index if not exists idx_cafe_vendas_movimento_financeiro_id
  on public.cafe_vendas (movimento_financeiro_id);

create index if not exists idx_cafe_vendas_status_financeiro
  on public.cafe_vendas (status_financeiro);

create index if not exists idx_cafe_vendas_competencia_ano_mes
  on public.cafe_vendas (competencia_ano_mes);

alter table public.cafe_vendas
  drop constraint if exists cafe_vendas_tipo_quitacao_check;

alter table public.cafe_vendas
  add constraint cafe_vendas_tipo_quitacao_check
  check (
    tipo_quitacao in (
      'IMEDIATA',
      'PARCIAL',
      'CONTA_INTERNA_COLABORADOR',
      'CONTA_INTERNA',
      'CARTAO_CONEXAO'
    )
  );

alter table public.cafe_vendas
  drop constraint if exists cafe_vendas_comprador_tipo_check;

alter table public.cafe_vendas
  add constraint cafe_vendas_comprador_tipo_check
  check (
    comprador_tipo is null
    or comprador_tipo in (
      'NAO_IDENTIFICADO',
      'ALUNO',
      'COLABORADOR',
      'PESSOA_AVULSA'
    )
  );

alter table public.cafe_vendas
  drop constraint if exists cafe_vendas_status_financeiro_check;

alter table public.cafe_vendas
  add constraint cafe_vendas_status_financeiro_check
  check (
    status_financeiro in (
      'PENDENTE',
      'PAGO_IMEDIATO',
      'EM_COBRANCA',
      'FATURADO_CARTAO_CONEXAO',
      'EM_CONTA_INTERNA',
      'CANCELADO'
    )
  );

do $$
declare
  v_centro_cafe integer;
  v_conta_banco_cafe bigint;
  v_conta_caixa_cafe bigint;
begin
  select id into v_centro_cafe
  from public.centros_custo
  where upper(coalesce(codigo, '')) = 'CAFE'
     or upper(coalesce(nome, '')) like '%CAFE%'
  order by case when upper(coalesce(codigo, '')) = 'CAFE' then 0 else 1 end, id
  limit 1;

  select id into v_conta_banco_cafe
  from public.contas_financeiras
  where upper(coalesce(codigo, '')) = 'CAFE_CONTA'
     or upper(coalesce(nome, '')) like '%BALLET CAF%C%'
  order by case when upper(coalesce(codigo, '')) = 'CAFE_CONTA' then 0 else 1 end, id
  limit 1;

  select id into v_conta_caixa_cafe
  from public.contas_financeiras
  where upper(coalesce(codigo, '')) = 'CAFE_CAIXA'
     or upper(coalesce(nome, '')) like '%CAIXA%CAF%C%'
  order by case when upper(coalesce(codigo, '')) = 'CAFE_CAIXA' then 0 else 1 end, id
  limit 1;

  if v_centro_cafe is not null then
    update public.formas_pagamento_contexto
      set conta_financeira_id = v_conta_caixa_cafe,
          descricao_exibicao = coalesce(descricao_exibicao, 'Dinheiro'),
          ativo = true
    where centro_custo_id = v_centro_cafe
      and forma_pagamento_codigo = 'DINHEIRO';

    if not exists (
      select 1
      from public.formas_pagamento_contexto
      where centro_custo_id = v_centro_cafe
        and forma_pagamento_codigo = 'PIX'
        and coalesce(carteira_tipo, '') = ''
    ) then
      insert into public.formas_pagamento_contexto (
        centro_custo_id,
        forma_pagamento_codigo,
        descricao_exibicao,
        ativo,
        ordem_exibicao,
        conta_financeira_id,
        cartao_maquina_id,
        carteira_tipo
      )
      values (
        v_centro_cafe,
        'PIX',
        'Pix',
        true,
        15,
        v_conta_banco_cafe,
        null,
        null
      );
    else
      update public.formas_pagamento_contexto
        set conta_financeira_id = v_conta_banco_cafe,
            descricao_exibicao = 'Pix',
            ativo = true
      where centro_custo_id = v_centro_cafe
        and forma_pagamento_codigo = 'PIX'
        and coalesce(carteira_tipo, '') = '';
    end if;

    update public.formas_pagamento_contexto
      set conta_financeira_id = v_conta_banco_cafe,
          descricao_exibicao = 'Conta interna colaborador',
          ativo = true
    where centro_custo_id = v_centro_cafe
      and forma_pagamento_codigo = 'CREDIARIO_COLAB'
      and coalesce(carteira_tipo, '') = 'COLABORADOR';

    if not exists (
      select 1
      from public.formas_pagamento_contexto
      where centro_custo_id = v_centro_cafe
        and forma_pagamento_codigo = 'CARTAO_CONEXAO_COLAB'
        and coalesce(carteira_tipo, '') = 'COLABORADOR'
    ) then
      insert into public.formas_pagamento_contexto (
        centro_custo_id,
        forma_pagamento_codigo,
        descricao_exibicao,
        ativo,
        ordem_exibicao,
        conta_financeira_id,
        cartao_maquina_id,
        carteira_tipo
      )
      values (
        v_centro_cafe,
        'CARTAO_CONEXAO_COLAB',
        'Cartao Conexao Colaborador',
        true,
        35,
        null,
        null,
        'COLABORADOR'
      );
    end if;
  end if;
end $$;

comment on column public.cafe_vendas.comprador_tipo is
'Classificacao institucional do comprador do Ballet Cafe: NAO_IDENTIFICADO, ALUNO, COLABORADOR ou PESSOA_AVULSA.';

comment on column public.cafe_vendas.origem_financeira is
'Fluxo financeiro consolidado da venda do Ballet Cafe: IMEDIATO, CARTAO_EXTERNO, CARTAO_CONEXAO_ALUNO, CARTAO_CONEXAO_COLABORADOR ou CONTA_INTERNA.';

comment on column public.cafe_vendas.status_financeiro is
'Estado financeiro consolidado da comanda do Ballet Cafe depois da integracao com cobranca, recebimento, movimento financeiro e conta interna.';

comment on column public.cafe_vendas.competencia_ano_mes is
'Competencia financeira canonica da venda do Ballet Cafe quando o valor segue para fatura, Cartao Conexao ou conta interna.';

commit;
