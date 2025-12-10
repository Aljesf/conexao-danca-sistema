-- ============================================
-- Módulo Crédito Conexão - Tabelas iniciais
-- ============================================
-- Produto: Cartão Conexão (Aluno / Colaborador)
-- Técnico: credito_conexao_*
--
-- Tabelas criadas:
-- 1) credito_conexao_contas
-- 2) credito_conexao_lancamentos
-- 3) credito_conexao_faturas
-- 4) credito_conexao_fatura_lancamentos

------------------------------------------------
-- 1) credito_conexao_contas
------------------------------------------------
CREATE TABLE public.credito_conexao_contas (
  id bigserial PRIMARY KEY,
  pessoa_titular_id bigint NOT NULL,
  tipo_conta text NOT NULL, -- 'ALUNO', 'COLABORADOR', etc.
  descricao_exibicao text NULL,

  dia_fechamento integer NOT NULL DEFAULT 10,  -- dia do mês que fecha a fatura
  dia_vencimento integer NULL,                -- dia do mês que vence a fatura (apenas para ALUNO)

  centro_custo_principal_id integer NULL,
  conta_financeira_origem_id bigint NULL,   -- de onde sai o pagamento da fatura
  conta_financeira_destino_id bigint NULL,  -- para onde entra o valor (LOJA, etc.)

  limite_credito_centavos integer NULL,     -- limite futuro, em centavos

  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credito_conexao_contas_tipo_conta_chk
    CHECK (tipo_conta IN ('ALUNO', 'COLABORADOR')),

  CONSTRAINT credito_conexao_contas_pessoa_titular_fkey
    FOREIGN KEY (pessoa_titular_id) REFERENCES public.pessoas (id),

  CONSTRAINT credito_conexao_contas_centro_custo_fkey
    FOREIGN KEY (centro_custo_principal_id) REFERENCES public.centros_custo (id),

  CONSTRAINT credito_conexao_contas_conta_financeira_origem_fkey
    FOREIGN KEY (conta_financeira_origem_id) REFERENCES public.contas_financeiras (id),

  CONSTRAINT credito_conexao_contas_conta_financeira_destino_fkey
    FOREIGN KEY (conta_financeira_destino_id) REFERENCES public.contas_financeiras (id)
);

CREATE INDEX credito_conexao_contas_pessoa_idx
  ON public.credito_conexao_contas (pessoa_titular_id);

CREATE INDEX credito_conexao_contas_tipo_conta_idx
  ON public.credito_conexao_contas (tipo_conta);

CREATE INDEX credito_conexao_contas_ativo_idx
  ON public.credito_conexao_contas (ativo);

------------------------------------------------
-- 2) credito_conexao_lancamentos
------------------------------------------------
CREATE TABLE public.credito_conexao_lancamentos (
  id bigserial PRIMARY KEY,

  conta_conexao_id bigint NOT NULL,
  origem_sistema text NOT NULL,   -- 'LOJA', 'ESCOLA', 'CAFE', 'CONSULTA', etc.
  origem_id bigint NULL,          -- id na origem (ex.: id da venda)

  descricao text NULL,

  valor_centavos integer NOT NULL,      -- positivo = débito, negativo = ajuste/crédito
  data_lancamento date NOT NULL DEFAULT (CURRENT_DATE),

  status text NOT NULL DEFAULT 'PENDENTE_FATURA', -- 'PENDENTE_FATURA', 'FATURADO', 'CANCELADO'

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credito_conexao_lancamentos_conta_fkey
    FOREIGN KEY (conta_conexao_id) REFERENCES public.credito_conexao_contas (id)
    ON DELETE CASCADE,

  CONSTRAINT credito_conexao_lancamentos_status_chk
    CHECK (status IN ('PENDENTE_FATURA', 'FATURADO', 'CANCELADO'))
);

CREATE INDEX credito_conexao_lancamentos_conta_idx
  ON public.credito_conexao_lancamentos (conta_conexao_id);

CREATE INDEX credito_conexao_lancamentos_status_idx
  ON public.credito_conexao_lancamentos (status);

CREATE INDEX credito_conexao_lancamentos_data_idx
  ON public.credito_conexao_lancamentos (data_lancamento);

------------------------------------------------
-- 3) credito_conexao_faturas
------------------------------------------------
CREATE TABLE public.credito_conexao_faturas (
  id bigserial PRIMARY KEY,

  conta_conexao_id bigint NOT NULL,

  periodo_referencia text NOT NULL, -- ex.: '2025-12'
  data_fechamento date NOT NULL,
  data_vencimento date NULL,        -- para ALUNO (boleto), para COLABORADOR pode ser data da folha

  valor_total_centavos integer NOT NULL,

  status text NOT NULL DEFAULT 'ABERTA', -- 'ABERTA', 'PAGA', 'EM_ATRASO', 'CANCELADA'

  cobranca_id bigint NULL,              -- FK opcional para tabela cobrancas (Alunos)
  neofin_invoice_id text NULL,          -- id da fatura/boletos na Neofin (quando integrado)
  folha_pagamento_id bigint NULL,       -- referência futura à folha de pagamento (sem FK por enquanto)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credito_conexao_faturas_conta_fkey
    FOREIGN KEY (conta_conexao_id) REFERENCES public.credito_conexao_contas (id),

  CONSTRAINT credito_conexao_faturas_status_chk
    CHECK (status IN ('ABERTA', 'PAGA', 'EM_ATRASO', 'CANCELADA')),

  CONSTRAINT credito_conexao_faturas_cobranca_fkey
    FOREIGN KEY (cobranca_id) REFERENCES public.cobrancas (id)
);

CREATE INDEX credito_conexao_faturas_conta_idx
  ON public.credito_conexao_faturas (conta_conexao_id);

CREATE INDEX credito_conexao_faturas_status_idx
  ON public.credito_conexao_faturas (status);

CREATE INDEX credito_conexao_faturas_vencimento_idx
  ON public.credito_conexao_faturas (data_vencimento);

------------------------------------------------
-- 4) credito_conexao_fatura_lancamentos
------------------------------------------------
CREATE TABLE public.credito_conexao_fatura_lancamentos (
  fatura_id bigint NOT NULL,
  lancamento_id bigint NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credito_conexao_fatura_lancamentos_pkey
    PRIMARY KEY (fatura_id, lancamento_id),

  CONSTRAINT credito_conexao_fatura_lancamentos_fatura_fkey
    FOREIGN KEY (fatura_id) REFERENCES public.credito_conexao_faturas (id)
    ON DELETE CASCADE,

  CONSTRAINT credito_conexao_fatura_lancamentos_lancamento_fkey
    FOREIGN KEY (lancamento_id) REFERENCES public.credito_conexao_lancamentos (id)
);

-- Um lançamento só pode pertencer a uma única fatura
CREATE UNIQUE INDEX credito_conexao_fatura_lancamentos_lancamento_uniq
  ON public.credito_conexao_fatura_lancamentos (lancamento_id);
