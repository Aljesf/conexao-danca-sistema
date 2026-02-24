-- ===========================================
-- Migration — Módulo Loja v0 (AJ Dance Store)
-- Criação das tabelas:
-- - loja_produtos
-- - loja_vendas
-- - loja_venda_itens
-- ===========================================

-- 1) BACKUP AUTOMÁTICO (ANTES DE QUALQUER ALTERAÇÃO)
-- Execute estes comandos no terminal ANTES de rodar a migration:
-- (No VS Code / pasta do projeto)

-- git add .
-- git commit -m "Backup automático antes de criar módulo Loja v0"
-- git tag -a backup-loja-v0-$(date +'%Y-%m-%d-%H-%M') -m "Backup automático antes de criar módulo Loja v0"

-- Depois do backup, aplique esta migration normalmente
-- (via Supabase CLI ou Editor SQL).


-- ===========================================
-- 2) TABELA loja_produtos
-- Catálogo simples de produtos da AJ Dance Store
-- Baseado no documento modelo-loja-v0.md
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_produtos (
  id                    BIGSERIAL PRIMARY KEY,
  codigo                TEXT UNIQUE,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  categoria             TEXT,
  preco_venda_centavos  INTEGER NOT NULL,
  unidade               TEXT NOT NULL DEFAULT 'UN',
  estoque_atual         INTEGER NOT NULL DEFAULT 0,
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.loja_produtos IS 'Catálogo de produtos da AJ Dance Store (Loja v0).';
COMMENT ON COLUMN public.loja_produtos.preco_venda_centavos IS 'Preço de venda em centavos (inteiro).';
COMMENT ON COLUMN public.loja_produtos.unidade IS 'Unidade de venda (ex.: UN, PAR, KIT).';
COMMENT ON COLUMN public.loja_produtos.estoque_atual IS 'Estoque atual do produto.';
-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_loja_produtos_nome
  ON public.loja_produtos (nome);
CREATE INDEX IF NOT EXISTS idx_loja_produtos_categoria
  ON public.loja_produtos (categoria);
-- ===========================================
-- 3) TABELA loja_vendas
-- Cabeçalho de vendas/entregas da Loja v0
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_vendas (
  id                       BIGSERIAL PRIMARY KEY,

  -- Quem paga / cliente da venda
  cliente_pessoa_id        BIGINT NOT NULL REFERENCES public.pessoas(id),

  -- Tipo de operação: VENDA / CREDIARIO_INTERNO / ENTREGA_FIGURINO
  tipo_venda               TEXT NOT NULL CHECK (
                              tipo_venda IN ('VENDA', 'CREDIARIO_INTERNO', 'ENTREGA_FIGURINO')
                            ),

  valor_total_centavos     INTEGER NOT NULL,
  desconto_centavos        INTEGER NOT NULL DEFAULT 0,

  -- Forma de pagamento: AVISTA / CREDIARIO_INTERNO / OUTRO (texto livre por enquanto)
  forma_pagamento          TEXT NOT NULL,

  -- Status do pagamento: PENDENTE / PAGO / PARCIAL
  status_pagamento         TEXT NOT NULL,

  -- Status da venda: ATIVA / CANCELADA
  status_venda             TEXT NOT NULL DEFAULT 'ATIVA' CHECK (
                              status_venda IN ('ATIVA', 'CANCELADA')
                            ),

  data_venda               TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_vencimento          DATE,

  observacoes              TEXT,
  observacao_vendedor      TEXT,

  -- Quem realizou a venda e quem cancelou
  vendedor_user_id         UUID REFERENCES public.profiles(user_id),
  cancelada_em             TIMESTAMPTZ,
  cancelada_por_user_id    UUID REFERENCES public.profiles(user_id),
  motivo_cancelamento      TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.loja_vendas IS 'Cabeçalho de vendas/entregas da Loja v0 (AJ Dance Store).';
COMMENT ON COLUMN public.loja_vendas.cliente_pessoa_id IS 'Pessoa responsável financeira / cliente da venda.';
COMMENT ON COLUMN public.loja_vendas.tipo_venda IS 'VENDA, CREDIARIO_INTERNO ou ENTREGA_FIGURINO.';
COMMENT ON COLUMN public.loja_vendas.status_pagamento IS 'PENDENTE, PAGO ou PARCIAL.';
COMMENT ON COLUMN public.loja_vendas.status_venda IS 'ATIVA ou CANCELADA.';
COMMENT ON COLUMN public.loja_vendas.observacao_vendedor IS 'Feedback do vendedor sobre o fluxo da Loja v0.';
COMMENT ON COLUMN public.loja_vendas.vendedor_user_id IS 'Usuário (profiles.user_id) que registrou a venda.';
COMMENT ON COLUMN public.loja_vendas.cancelada_por_user_id IS 'Usuário (profiles.user_id) que cancelou a venda.';
-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_loja_vendas_cliente
  ON public.loja_vendas (cliente_pessoa_id);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_tipo_venda
  ON public.loja_vendas (tipo_venda);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_status_venda
  ON public.loja_vendas (status_venda);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_data_venda
  ON public.loja_vendas (data_venda);
CREATE INDEX IF NOT EXISTS idx_loja_vendas_vendedor
  ON public.loja_vendas (vendedor_user_id);
-- ===========================================
-- 4) TABELA loja_venda_itens
-- Itens por venda/entrega
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_venda_itens (
  id                     BIGSERIAL PRIMARY KEY,

  venda_id               BIGINT NOT NULL REFERENCES public.loja_vendas(id) ON DELETE CASCADE,
  produto_id             BIGINT NOT NULL REFERENCES public.loja_produtos(id),

  quantidade             INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos >= 0),
  total_centavos         INTEGER NOT NULL CHECK (total_centavos >= 0),

  -- Quem vai usar o item (normalmente o aluno)
  beneficiario_pessoa_id BIGINT REFERENCES public.pessoas(id),

  observacoes            TEXT
);
COMMENT ON TABLE public.loja_venda_itens IS 'Itens de cada venda/entrega da Loja v0.';
COMMENT ON COLUMN public.loja_venda_itens.beneficiario_pessoa_id IS 'Pessoa beneficiária (aluno) que vai usar o item, quando aplicável.';
-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_loja_venda_itens_venda
  ON public.loja_venda_itens (venda_id);
CREATE INDEX IF NOT EXISTS idx_loja_venda_itens_produto
  ON public.loja_venda_itens (produto_id);
CREATE INDEX IF NOT EXISTS idx_loja_venda_itens_beneficiario
  ON public.loja_venda_itens (beneficiario_pessoa_id);
-- ===========================================
-- 5) NOTAS FINAIS
-- - Integração com financeiro (cobrancas/recebimentos) NÃO está habilitada nesta v0;
--   isso será tratado em migrations futuras.
-- - Campos de observação do vendedor (feedback) servirão para refinarmos a Loja v1.
-- ===========================================;
