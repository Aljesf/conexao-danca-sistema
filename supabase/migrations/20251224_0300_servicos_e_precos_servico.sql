-- =====================================================================================
-- Serviços (alvo universal de matrícula) + Preços por Serviço/Ano
-- Data: 2025-12-24
-- Objetivo:
-- - permitir matrícula para TURMA, CURSO_LIVRE, WORKSHOP, ESPETACULO/EVENTO
-- - permitir matrícula sem turma (vinculo_id nullable)
-- - precificação por serviço/ano (paralelo a preços por turma)
-- =====================================================================================

BEGIN;
-- 1) Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL, -- TURMA | CURSO_LIVRE | WORKSHOP | ESPETACULO | EVENTO
  origem_tabela TEXT NULL, -- ex: 'turmas', 'eventos'
  origem_id BIGINT NULL,   -- id da origem (ex: turma_id)
  ano_referencia INT NULL, -- para serviços anuais (turma); pode ser NULL em evento pontual
  titulo TEXT NOT NULL,
  descricao TEXT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servicos_tipo_chk'
      AND conrelid = 'public.servicos'::regclass
  ) THEN
    ALTER TABLE public.servicos
      ADD CONSTRAINT servicos_tipo_chk
      CHECK (tipo IN ('TURMA','CURSO_LIVRE','WORKSHOP','ESPETACULO','EVENTO'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_servicos_origem_ano
  ON public.servicos (tipo, origem_tabela, origem_id, COALESCE(ano_referencia, -1));
CREATE INDEX IF NOT EXISTS idx_servicos_tipo_ativo
  ON public.servicos (tipo, ativo);
-- 2) Matrículas: referência opcional ao serviço
ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS servico_id BIGINT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matriculas_servico_fk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_servico_fk
      FOREIGN KEY (servico_id) REFERENCES public.servicos(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_matriculas_servico_id
  ON public.matriculas (servico_id);
-- 3) Matrículas: permitir sem turma (vinculo_id nullable)
DO $$
DECLARE
  is_notnull BOOLEAN;
BEGIN
  SELECT a.attnotnull
    INTO is_notnull
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'matriculas'
    AND a.attname = 'vinculo_id'
    AND a.attnum > 0;

  IF is_notnull IS TRUE THEN
    EXECUTE 'ALTER TABLE public.matriculas ALTER COLUMN vinculo_id DROP NOT NULL';
  END IF;
END $$;
-- 4) Preços por Serviço/Ano
CREATE TABLE IF NOT EXISTS public.matricula_precos_servico (
  id BIGSERIAL PRIMARY KEY,
  servico_id BIGINT NOT NULL REFERENCES public.servicos(id),
  ano_referencia INT NOT NULL,
  plano_id BIGINT NOT NULL REFERENCES public.matricula_planos(id),
  centro_custo_id BIGINT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_matricula_precos_servico_unico
  ON public.matricula_precos_servico (servico_id, ano_referencia);
CREATE INDEX IF NOT EXISTS idx_matricula_precos_servico_ativo
  ON public.matricula_precos_servico (ativo);
COMMIT;
