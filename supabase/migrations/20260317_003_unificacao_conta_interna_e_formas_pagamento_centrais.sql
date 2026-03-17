begin;

-- Evolui o cadastro central ja existente de formas_pagamento e formas_pagamento_contexto.
alter table public.formas_pagamento
add column if not exists tipo_fluxo_saas text,
add column if not exists exige_troco boolean not null default false,
add column if not exists exige_maquininha boolean not null default false,
add column if not exists exige_bandeira boolean not null default false,
add column if not exists exige_conta_interna boolean not null default false;

alter table public.formas_pagamento
drop constraint if exists formas_pagamento_tipo_fluxo_saas_check;

alter table public.formas_pagamento
add constraint formas_pagamento_tipo_fluxo_saas_check
check (
  tipo_fluxo_saas is null
  or tipo_fluxo_saas in (
    'DINHEIRO',
    'PIX',
    'CARTAO',
    'CREDIARIO',
    'CONTA_INTERNA_ALUNO',
    'CONTA_INTERNA_COLABORADOR'
  )
);

update public.formas_pagamento
set
  tipo_fluxo_saas = case
    when codigo in ('DINHEIRO') then 'DINHEIRO'
    when codigo in ('PIX') then 'PIX'
    when codigo in ('CARTAO_CONEXAO_ALUNO', 'CREDITO_ALUNO', 'CONTA_INTERNA_ALUNO') then 'CONTA_INTERNA_ALUNO'
    when codigo in (
      'CARTAO_CONEXAO_COLAB',
      'CARTAO_CONEXAO_COLABORADOR',
      'CONTA_INTERNA',
      'CONTA_INTERNA_COLABORADOR',
      'CREDIARIO_COLAB'
    ) then 'CONTA_INTERNA_COLABORADOR'
    when tipo_base = 'CREDIARIO' then 'CREDIARIO'
    when tipo_base = 'CARTAO' then 'CARTAO'
    else tipo_fluxo_saas
  end,
  exige_troco = case when codigo = 'DINHEIRO' then true else exige_troco end,
  exige_maquininha = case when tipo_base = 'CARTAO' then true else exige_maquininha end,
  exige_bandeira = case when tipo_base = 'CARTAO' then true else exige_bandeira end,
  exige_conta_interna = case
    when codigo in (
      'CARTAO_CONEXAO_ALUNO',
      'CREDITO_ALUNO',
      'CONTA_INTERNA_ALUNO',
      'CARTAO_CONEXAO_COLAB',
      'CARTAO_CONEXAO_COLABORADOR',
      'CONTA_INTERNA',
      'CONTA_INTERNA_COLABORADOR',
      'CREDIARIO_COLAB'
    ) then true
    else exige_conta_interna
  end
where tipo_fluxo_saas is null
   or codigo in (
     'DINHEIRO',
     'PIX',
     'CARTAO_CONEXAO_ALUNO',
     'CREDITO_ALUNO',
     'CONTA_INTERNA_ALUNO',
     'CARTAO_CONEXAO_COLAB',
     'CARTAO_CONEXAO_COLABORADOR',
     'CONTA_INTERNA',
     'CONTA_INTERNA_COLABORADOR',
     'CREDIARIO_COLAB'
   )
   or tipo_base in ('CARTAO', 'CREDIARIO');

comment on column public.formas_pagamento.tipo_fluxo_saas is
'Classificacao central da forma de pagamento para uso SaaS em Cafe, Loja e demais contextos.';

comment on column public.formas_pagamento.exige_troco is
'Indica se a forma de pagamento exige valor recebido e calculo de troco.';

comment on column public.formas_pagamento.exige_maquininha is
'Indica se a forma exige maquininha de cartao configurada.';

comment on column public.formas_pagamento.exige_bandeira is
'Indica se a forma exige bandeira/operacao de cartao.';

comment on column public.formas_pagamento.exige_conta_interna is
'Indica se a forma depende de conta interna elegivel do aluno/responsavel ou colaborador.';

-- Mantem a tabela canônica de conta interna/credito e adiciona metadados unificados.
alter table public.credito_conexao_contas
add column if not exists tipo_titular text,
add column if not exists responsavel_financeiro_pessoa_id bigint,
add column if not exists tipo_liquidacao text;

alter table public.credito_conexao_contas
drop constraint if exists credito_conexao_contas_tipo_titular_check;

alter table public.credito_conexao_contas
add constraint credito_conexao_contas_tipo_titular_check
check (
  tipo_titular is null
  or tipo_titular in (
    'ALUNO',
    'RESPONSAVEL_FINANCEIRO',
    'COLABORADOR'
  )
);

alter table public.credito_conexao_contas
drop constraint if exists credito_conexao_contas_tipo_liquidacao_check;

alter table public.credito_conexao_contas
add constraint credito_conexao_contas_tipo_liquidacao_check
check (
  tipo_liquidacao is null
  or tipo_liquidacao in (
    'FATURA_MENSAL',
    'FOLHA_PAGAMENTO'
  )
);

do $$
begin
  begin
    alter table public.credito_conexao_contas
    add constraint credito_conexao_contas_responsavel_financeiro_pessoa_id_fkey
    foreign key (responsavel_financeiro_pessoa_id)
    references public.pessoas(id)
    on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

update public.credito_conexao_contas
set
  tipo_titular = case
    when tipo_conta = 'COLABORADOR' then 'COLABORADOR'
    when tipo_conta = 'ALUNO' then coalesce(tipo_titular, 'RESPONSAVEL_FINANCEIRO')
    else tipo_titular
  end,
  tipo_liquidacao = case
    when tipo_conta = 'COLABORADOR' then 'FOLHA_PAGAMENTO'
    when tipo_conta = 'ALUNO' then 'FATURA_MENSAL'
    else tipo_liquidacao
  end
where tipo_titular is null or tipo_liquidacao is null;

comment on column public.credito_conexao_contas.tipo_titular is
'Identifica se a conta interna pertence ao aluno, ao responsavel financeiro ou ao colaborador.';

comment on column public.credito_conexao_contas.responsavel_financeiro_pessoa_id is
'Pessoa responsavel pela liquidacao da conta interna do aluno quando aplicavel.';

comment on column public.credito_conexao_contas.tipo_liquidacao is
'Ciclo institucional da conta interna: FATURA_MENSAL para aluno/responsavel e FOLHA_PAGAMENTO para colaborador.';

-- Amarra Cafe e Loja ao cadastro central de forma de pagamento por contexto, sem criar financeiro paralelo.
alter table public.cafe_vendas
add column if not exists forma_pagamento_contexto_id bigint,
add column if not exists valor_recebido_centavos bigint,
add column if not exists troco_centavos bigint;

alter table public.loja_vendas
add column if not exists forma_pagamento_contexto_id bigint,
add column if not exists cartao_maquina_id bigint,
add column if not exists valor_recebido_centavos bigint,
add column if not exists troco_centavos bigint;

do $$
begin
  begin
    alter table public.cafe_vendas
    add constraint cafe_vendas_forma_pagamento_contexto_id_fkey
    foreign key (forma_pagamento_contexto_id)
    references public.formas_pagamento_contexto(id)
    on delete set null;
  exception when duplicate_object then
    null;
  end;

  begin
    alter table public.loja_vendas
    add constraint loja_vendas_forma_pagamento_contexto_id_fkey
    foreign key (forma_pagamento_contexto_id)
    references public.formas_pagamento_contexto(id)
    on delete set null;
  exception when duplicate_object then
    null;
  end;

  begin
    alter table public.loja_vendas
    add constraint loja_vendas_cartao_maquina_id_fkey
    foreign key (cartao_maquina_id)
    references public.cartao_maquinas(id)
    on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

create index if not exists idx_formas_pagamento_tipo_fluxo_saas
on public.formas_pagamento (tipo_fluxo_saas);

create index if not exists idx_credito_conexao_contas_tipo_titular
on public.credito_conexao_contas (tipo_titular);

create index if not exists idx_credito_conexao_contas_responsavel_financeiro
on public.credito_conexao_contas (responsavel_financeiro_pessoa_id);

create index if not exists idx_credito_conexao_contas_tipo_liquidacao
on public.credito_conexao_contas (tipo_liquidacao);

create index if not exists idx_cafe_vendas_forma_pagamento_contexto_id
on public.cafe_vendas (forma_pagamento_contexto_id);

create index if not exists idx_loja_vendas_forma_pagamento_contexto_id
on public.loja_vendas (forma_pagamento_contexto_id);

create index if not exists idx_loja_vendas_cartao_maquina_id
on public.loja_vendas (cartao_maquina_id);

commit;
