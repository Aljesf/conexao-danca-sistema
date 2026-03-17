begin;

-- Compatibilidade com o schema legado real:
-- a base atual usa public.formas_pagamento + public.formas_pagamento_contexto.
-- Esta migration popula os metadados SaaS nessas tabelas existentes.

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
    when codigo = 'DINHEIRO' then 'DINHEIRO'
    when codigo = 'PIX' then 'PIX'
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

create index if not exists idx_formas_pagamento_tipo_fluxo_saas
on public.formas_pagamento (tipo_fluxo_saas);

comment on column public.formas_pagamento.tipo_fluxo_saas is
'Backfill do legado para permitir que Cafe, Loja e demais contextos resolvam formas centrais sem depender de seed novo.';

comment on column public.formas_pagamento.exige_conta_interna is
'Identifica formas que dependem de conta interna elegivel do aluno/responsavel ou colaborador.';

commit;
