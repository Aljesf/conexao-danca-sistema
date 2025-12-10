-- Etapa 1 cartao de credito - estrutura basica

-- 1.1 Maquininhas de cartao
CREATE TABLE public.cartao_maquinas (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  operadora text NULL,
  conta_financeira_id bigint NOT NULL REFERENCES contas_financeiras(id),
  centro_custo_id integer NOT NULL REFERENCES centros_custo(id),
  ativo boolean NOT NULL DEFAULT true,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cartao_maquinas_conta_idx
  ON public.cartao_maquinas (conta_financeira_id);

CREATE INDEX cartao_maquinas_centro_idx
  ON public.cartao_maquinas (centro_custo_id);

-- 1.2 Bandeiras de cartao
CREATE TABLE public.cartao_bandeiras (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  codigo text UNIQUE NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.3 Regras de operacao (maquininha + bandeira + tipo)
CREATE TABLE public.cartao_regras_operacao (
  id bigserial PRIMARY KEY,
  maquina_id bigint NOT NULL REFERENCES cartao_maquinas(id),
  bandeira_id bigint NOT NULL REFERENCES cartao_bandeiras(id),
  tipo_transacao text NOT NULL, -- ex.: 'CREDITO'
  prazo_recebimento_dias integer NOT NULL DEFAULT 30,
  taxa_percentual numeric(6,3) NOT NULL DEFAULT 0, -- ex.: 3.290
  taxa_fixa_centavos integer NOT NULL DEFAULT 0,
  permitir_parcelado boolean NOT NULL DEFAULT true,
  max_parcelas integer NOT NULL DEFAULT 12,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cartao_regras_operacao_unq UNIQUE (maquina_id, bandeira_id, tipo_transacao)
);

CREATE INDEX cartao_regras_operacao_maquina_idx
  ON public.cartao_regras_operacao (maquina_id);

-- 1.4 Recebiveis de cartao (Etapa 1: 1 linha por venda)
CREATE TABLE public.cartao_recebiveis (
  id bigserial PRIMARY KEY,
  venda_id bigint NOT NULL REFERENCES loja_vendas(id),
  maquina_id bigint NOT NULL REFERENCES cartao_maquinas(id),
  bandeira_id bigint NOT NULL REFERENCES cartao_bandeiras(id),
  conta_financeira_id bigint NOT NULL REFERENCES contas_financeiras(id),
  valor_bruto_centavos integer NOT NULL,
  taxa_operadora_centavos integer NOT NULL DEFAULT 0,
  valor_liquido_centavos integer NOT NULL,
  numero_parcelas integer NOT NULL DEFAULT 1,
  data_prevista_pagamento date NOT NULL,
  status text NOT NULL DEFAULT 'PREVISTO', -- PREVISTO | PAGO | CANCELADO
  data_pagamento_real date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cartao_recebiveis_status_data_idx
  ON public.cartao_recebiveis (status, data_prevista_pagamento);

CREATE INDEX cartao_recebiveis_venda_idx
  ON public.cartao_recebiveis (venda_id);
