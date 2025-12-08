-- ===========================================
-- Migration — Módulo Loja v0 (Fornecedores)
-- Criação das tabelas:
-- - loja_fornecedores
-- - loja_fornecedor_precos
-- ===========================================

-- 1) BACKUP AUTOMÁTICO (ANTES DE QUALQUER ALTERAÇÃO)
-- Execute estes comandos no terminal ANTES de rodar a migration:
-- (No VS Code / pasta do projeto)

-- git add .
-- git commit -m "Backup automático antes de criar módulo Loja v0 - Fornecedores"
-- git tag -a backup-loja-fornecedores-$(date +'%Y-%m-%d-%H-%M') -m "Backup antes de criar módulo Loja v0 - Fornecedores"

-- Depois do backup, aplique esta migration no Supabase
-- colando o conteúdo no Editor SQL do painel.


-- ===========================================
-- 2) TABELA loja_fornecedores
-- Marca quais Pessoas (pessoas.id) são fornecedores da Loja
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_fornecedores (
  id              BIGSERIAL PRIMARY KEY,
  pessoa_id       BIGINT NOT NULL REFERENCES public.pessoas(id),
  codigo_interno  TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT loja_fornecedores_pessoa_unique UNIQUE (pessoa_id)
);

COMMENT ON TABLE public.loja_fornecedores IS
  'Pessoas que atuam como fornecedores da Loja (AJ Dance Store). Wrapper de pessoas.id.';

COMMENT ON COLUMN public.loja_fornecedores.pessoa_id IS
  'FK para pessoas.id. A Pessoa pode ser física ou jurídica (fornecedor).';

COMMENT ON COLUMN public.loja_fornecedores.codigo_interno IS
  'Código interno do fornecedor na Loja (opcional).';

CREATE INDEX IF NOT EXISTS idx_loja_fornecedores_pessoa
  ON public.loja_fornecedores (pessoa_id);

CREATE INDEX IF NOT EXISTS idx_loja_fornecedores_ativo
  ON public.loja_fornecedores (ativo);


-- ===========================================
-- 3) TABELA loja_fornecedor_precos
-- Histórico de preços de custo por fornecedor e produto
-- ===========================================

CREATE TABLE IF NOT EXISTS public.loja_fornecedor_precos (
  id                     BIGSERIAL PRIMARY KEY,
  fornecedor_id          BIGINT NOT NULL REFERENCES public.loja_fornecedores(id) ON DELETE CASCADE,
  produto_id             BIGINT NOT NULL REFERENCES public.loja_produtos(id) ON DELETE CASCADE,
  preco_custo_centavos   INTEGER NOT NULL,
  moeda                  TEXT NOT NULL DEFAULT 'BRL',
  data_referencia        DATE NOT NULL DEFAULT current_date,
  observacoes            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.loja_fornecedor_precos IS
  'Histórico de preços de custo de produtos por fornecedor (régua de preços da Loja v0).';

COMMENT ON COLUMN public.loja_fornecedor_precos.preco_custo_centavos IS
  'Preço de custo em centavos (inteiro).';

COMMENT ON COLUMN public.loja_fornecedor_precos.data_referencia IS
  'Data de referência do preço de custo (negociação/compra).';

CREATE INDEX IF NOT EXISTS idx_loja_fornecedor_precos_fornecedor
  ON public.loja_fornecedor_precos (fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_loja_fornecedor_precos_produto
  ON public.loja_fornecedor_precos (produto_id);

CREATE INDEX IF NOT EXISTS idx_loja_fornecedor_precos_data
  ON public.loja_fornecedor_precos (data_referencia DESC);

CREATE INDEX IF NOT EXISTS idx_loja_fornecedor_precos_fornecedor_produto_data
  ON public.loja_fornecedor_precos (fornecedor_id, produto_id, data_referencia DESC);


-- ===========================================
-- 4) NOTAS FINAIS
-- - Não altera tabelas existentes (loja_produtos, loja_vendas, etc.).
-- - Fornecedor é sempre uma Pessoa em pessoas.id, alinhado ao modelo padrão.
-- - A tabela loja_fornecedor_precos guarda histórico de preços de custo
--   e pode ser usada futuramente para relatórios, Estoque e Loja v1.
-- ===========================================
