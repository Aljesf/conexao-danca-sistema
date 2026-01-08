-- Movimento - Banco de creditos (MVP)
-- 2026-01-07

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'movimento_credito_tipo' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.movimento_credito_tipo AS ENUM ('CR_REGULAR', 'CR_LIVRE', 'CR_PROJETO');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'movimento_credito_origem' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.movimento_credito_origem AS ENUM ('INSTITUCIONAL_AUTOMATICA', 'EXTERNA');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'movimento_credito_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.movimento_credito_status AS ENUM ('ATIVO', 'CONSUMIDO', 'CANCELADO', 'EXPIRADO');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'movimento_compromisso_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.movimento_compromisso_status AS ENUM ('ATIVO', 'CANCELADO');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'movimento_execucao_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.movimento_execucao_status AS ENUM ('PENDENTE', 'EXECUTADO', 'ERRO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.movimento_creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id bigint NOT NULL,
  tipo public.movimento_credito_tipo NOT NULL,
  origem public.movimento_credito_origem NOT NULL,
  proposito text NOT NULL,
  curso_id bigint NULL,
  projeto_id bigint NULL,
  competencia_inicio text NOT NULL,
  competencia_fim text NOT NULL,
  quantidade_total integer NOT NULL CHECK (quantidade_total > 0),
  quantidade_consumida integer NOT NULL DEFAULT 0,
  status public.movimento_credito_status NOT NULL DEFAULT 'ATIVO',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid NULL
);

CREATE TABLE IF NOT EXISTS public.movimento_creditos_consumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id uuid NOT NULL REFERENCES public.movimento_creditos(id) ON DELETE CASCADE,
  aluno_id bigint NOT NULL,
  competencia text NOT NULL,
  operacao_tipo text NOT NULL,
  operacao_id bigint NOT NULL,
  consumido_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimento_creditos_compromissos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_id uuid NOT NULL REFERENCES public.movimento_creditos(id) ON DELETE CASCADE,
  aluno_id bigint NOT NULL,
  competencia text NOT NULL,
  operacao_tipo text NOT NULL,
  operacao_id bigint NOT NULL,
  status public.movimento_compromisso_status NOT NULL DEFAULT 'ATIVO',
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimento_regras_geracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  criterio_pagante text NOT NULL,
  proporcao_pagantes integer NOT NULL CHECK (proporcao_pagantes > 0),
  creditos_gerados integer NOT NULL CHECK (creditos_gerados > 0),
  limite_mensal integer NULL,
  reserva_percentual integer NULL CHECK (reserva_percentual BETWEEN 0 AND 100),
  vigencia_inicio text NOT NULL,
  vigencia_fim text NULL,
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimento_fontes_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimento_fontes_externas_cronograma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_id uuid NOT NULL REFERENCES public.movimento_fontes_externas(id) ON DELETE CASCADE,
  competencia text NOT NULL,
  quantidade_creditos integer NOT NULL CHECK (quantidade_creditos > 0),
  confirmado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimento_execucoes_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia text NOT NULL UNIQUE,
  status public.movimento_execucao_status NOT NULL DEFAULT 'PENDENTE',
  log_execucao text,
  executado_em timestamptz NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMIT;
