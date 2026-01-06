-- 20260106_0300_cc_lancamentos_cobranca_id.sql
-- Objetivo:
-- - Adicionar cobranca_id em credito_conexao_lancamentos (FK -> cobrancas.id)
-- - Indice para lookup por cobranca/competencia
-- - Garantir 1 cobranca -> 1 lancamento (UNIQUE)
-- Observacao:
-- - Mantemos cobranca_id como NULLABLE por compatibilidade com legados.
-- - O preenchimento de cobranca_id sera feito na etapa de API (proximo passo do fluxo).

DO $$
BEGIN
  -- 1) Coluna cobranca_id (nullable)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credito_conexao_lancamentos'
      AND column_name = 'cobranca_id'
  ) THEN
    ALTER TABLE public.credito_conexao_lancamentos
      ADD COLUMN cobranca_id bigint;
  END IF;

  -- 2) FK cobranca_id -> cobrancas.id
  -- (ON DELETE SET NULL para preservar historico do lancamento em cenarios extremos)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credito_conexao_lancamentos_cobranca_id_fkey'
  ) THEN
    ALTER TABLE public.credito_conexao_lancamentos
      ADD CONSTRAINT credito_conexao_lancamentos_cobranca_id_fkey
      FOREIGN KEY (cobranca_id)
      REFERENCES public.cobrancas(id)
      ON DELETE SET NULL;
  END IF;

  -- 3) UNIQUE para 1 cobranca -> 1 lancamento
  -- UNIQUE aceita multiplos NULL, entao nao quebra legados.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credito_conexao_lancamentos_cobranca_id_key'
  ) THEN
    ALTER TABLE public.credito_conexao_lancamentos
      ADD CONSTRAINT credito_conexao_lancamentos_cobranca_id_key
      UNIQUE (cobranca_id);
  END IF;
END $$;

-- 4) Indices (lookup/rebuild)
-- Observacao: "competencia" pode existir como coluna text (ex.: YYYY-MM).
-- Se a coluna tiver outro nome, ajustar aqui apos verificar o schema real.
CREATE INDEX IF NOT EXISTS idx_cc_lancamentos_cobranca_competencia
  ON public.credito_conexao_lancamentos (cobranca_id, competencia);

CREATE INDEX IF NOT EXISTS idx_cc_lancamentos_competencia
  ON public.credito_conexao_lancamentos (competencia);

-- 5) Comentario (opcional, ajuda manutencao)
COMMENT ON COLUMN public.credito_conexao_lancamentos.cobranca_id
  IS 'FK para cobrancas.id (unidade canonica financeira). Preenchido pela camada API ao gerar/upsert lancamentos do Cartao Conexao.';
