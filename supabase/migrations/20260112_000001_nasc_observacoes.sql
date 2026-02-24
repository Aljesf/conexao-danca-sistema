-- 20260112_000001_nasc_observacoes.sql
-- Registro de Observacoes Operacionais (NASC) - MVP
-- Tabela canonica para observacoes operacionais contextualizadas

BEGIN;
CREATE TABLE IF NOT EXISTS public.nasc_observacoes (
  id                 bigserial PRIMARY KEY,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Contexto de UI / navegacao
  app_context        text NULL,
  pathname           text NULL,
  full_url           text NULL,
  page_title         text NULL,
  entity_ref         text NULL,

  -- Conteudo principal
  observacao         text NOT NULL,

  -- Metadados uteis
  user_agent         text NULL,
  viewport_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_json       jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_nasc_observacoes_created_at
  ON public.nasc_observacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nasc_observacoes_created_by
  ON public.nasc_observacoes (created_by);
CREATE INDEX IF NOT EXISTS idx_nasc_observacoes_pathname
  ON public.nasc_observacoes (pathname);
CREATE INDEX IF NOT EXISTS idx_nasc_observacoes_context_json_gin
  ON public.nasc_observacoes USING gin (context_json);
ALTER TABLE public.nasc_observacoes ENABLE ROW LEVEL SECURITY;
-- MVP: qualquer usuario autenticado pode inserir e ler.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'nasc_observacoes'
      AND policyname = 'nasc_observacoes_insert_authenticated'
  ) THEN
    CREATE POLICY nasc_observacoes_insert_authenticated
      ON public.nasc_observacoes
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'nasc_observacoes'
      AND policyname = 'nasc_observacoes_select_authenticated'
  ) THEN
    CREATE POLICY nasc_observacoes_select_authenticated
      ON public.nasc_observacoes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
COMMIT;
