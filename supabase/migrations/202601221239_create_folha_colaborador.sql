-- MVP: Folha do Colaborador (Fechamento)
-- colaboradores.id é bigint conforme schema-supabase.sql

create table if not exists public.folha_pagamento_colaborador (
  id bigserial primary key,
  competencia_ano_mes text not null, -- YYYY-MM
  colaborador_id bigint not null,
  status text not null default 'ABERTA', -- ABERTA | FECHADA | PAGA | CANCELADA
  data_fechamento timestamp with time zone null,
  data_pagamento timestamp with time zone null,
  observacoes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ck_folha_pagamento_colaborador_competencia
    check (competencia_ano_mes ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint ux_folha_pagamento_colaborador unique (competencia_ano_mes, colaborador_id)
);

create index if not exists ix_folha_pagamento_colaborador_colaborador
  on public.folha_pagamento_colaborador (colaborador_id);

create index if not exists ix_folha_pagamento_colaborador_competencia
  on public.folha_pagamento_colaborador (competencia_ano_mes);

create table if not exists public.folha_pagamento_eventos (
  id bigserial primary key,
  folha_pagamento_id bigint not null references public.folha_pagamento_colaborador(id) on delete cascade,
  tipo text not null, -- PROVENTO | DESCONTO
  descricao text not null,
  valor_centavos integer not null,
  origem_tipo text null, -- 'CREDITO_CONEXAO_FATURA' | 'ADIANTAMENTO' | 'AJUSTE' | etc.
  origem_id bigint null, -- ex.: credito_conexao_faturas.id
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ck_folha_pagamento_eventos_tipo check (tipo in ('PROVENTO', 'DESCONTO')),
  constraint ck_folha_pagamento_eventos_valor check (valor_centavos >= 0)
);

create index if not exists ix_folha_pagamento_eventos_folha
  on public.folha_pagamento_eventos (folha_pagamento_id);

create index if not exists ix_folha_pagamento_eventos_origem
  on public.folha_pagamento_eventos (origem_tipo, origem_id);

-- Integração com Crédito Conexão:
create index if not exists ix_credito_conexao_faturas_folha_pagamento_id
  on public.credito_conexao_faturas (folha_pagamento_id);
