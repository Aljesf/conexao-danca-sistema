-- =========================================
-- Folha de Pagamento (Colaboradores)
-- =========================================

create table if not exists public.folha_pagamento (
  id bigserial primary key,
  competencia text not null, -- YYYY-MM
  status text not null default 'ABERTA', -- ABERTA | FECHADA | PAGA | CANCELADA
  data_fechamento date null,
  data_pagamento_prevista date null,
  observacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_folha_pagamento_competencia_uq
  on public.folha_pagamento (competencia);

create table if not exists public.folha_pagamento_itens (
  id bigserial primary key,
  folha_id bigint not null references public.folha_pagamento(id) on delete cascade,
  colaborador_id bigint not null references public.colaboradores(id) on delete restrict,
  tipo_item text not null, -- SALARIO | DESCONTO_CREDITO_CONEXAO | AJUSTE | OUTRO
  descricao text not null,
  valor_centavos integer not null, -- desconto deve ser positivo com tipo DESCONTO_*
  referencia_tipo text null, -- ex: CREDITO_CONEXAO_FATURA
  referencia_id bigint null, -- ex: credito_conexao_faturas.id
  criado_automatico boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_folha_itens_folha on public.folha_pagamento_itens (folha_id);
create index if not exists idx_folha_itens_colab on public.folha_pagamento_itens (colaborador_id);
create index if not exists idx_folha_itens_ref on public.folha_pagamento_itens (referencia_tipo, referencia_id);

-- Trigger simples de updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_folha_pagamento_updated_at on public.folha_pagamento;
create trigger trg_folha_pagamento_updated_at
before update on public.folha_pagamento
for each row execute function public.set_updated_at();

-- =========================================
-- Config Financeira do Colaborador
-- =========================================
create table if not exists public.colaborador_config_financeira (
  id bigserial primary key,
  colaborador_id bigint not null unique references public.colaboradores(id) on delete cascade,

  -- Regra "gera folha automaticamente"
  gera_folha boolean not null default false,

  -- Fechamento e pagamento
  dia_fechamento integer not null default 31, -- 1..31
  dia_pagamento integer not null default 5,   -- 1..31
  pagamento_no_mes_seguinte boolean not null default true,

  -- Politica do Cartao Conexao para colaborador
  politica_desconto_cartao text not null default 'DESCONTA_NA_FOLHA',
  -- DESCONTA_NA_FOLHA | NAO_DESCONTA | MANUAL

  politica_corte_cartao text not null default 'POR_DIA_FECHAMENTO',
  -- POR_DIA_FECHAMENTO | SEM_CORTE

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_colab_cfg_fin_updated_at on public.colaborador_config_financeira;
create trigger trg_colab_cfg_fin_updated_at
before update on public.colaborador_config_financeira
for each row execute function public.set_updated_at();

-- =========================================
-- Integridade com Credito Conexao
-- =========================================
create index if not exists idx_credito_faturas_folha_id
  on public.credito_conexao_faturas (folha_pagamento_id);

