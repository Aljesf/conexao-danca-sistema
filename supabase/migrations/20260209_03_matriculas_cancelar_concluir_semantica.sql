-- [INÍCIO DO BLOCO] supabase/migrations/20260209_03_matriculas_cancelar_concluir_semantica.sql

-- 1) Campos em cobrancas para auditoria de cancelamento (se ainda não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_em'
  ) THEN
    ALTER TABLE public.cobrancas ADD COLUMN cancelada_em timestamptz NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_motivo'
  ) THEN
    ALTER TABLE public.cobrancas ADD COLUMN cancelada_motivo text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_por_user_id'
  ) THEN
    ALTER TABLE public.cobrancas ADD COLUMN cancelada_por_user_id uuid NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cobrancas_cancelada_em ON public.cobrancas (cancelada_em);

-- 2) Campos em matriculas para metadados do encerramento/cancelamento (se ainda não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='encerramento_tipo'
  ) THEN
    ALTER TABLE public.matriculas ADD COLUMN encerramento_tipo text NULL; -- 'CONCLUIDA' | 'CANCELADA'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='encerramento_motivo'
  ) THEN
    ALTER TABLE public.matriculas ADD COLUMN encerramento_motivo text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='encerramento_em'
  ) THEN
    ALTER TABLE public.matriculas ADD COLUMN encerramento_em timestamptz NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='encerramento_por_user_id'
  ) THEN
    ALTER TABLE public.matriculas ADD COLUMN encerramento_por_user_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='data_encerramento'
  ) THEN
    ALTER TABLE public.matriculas ADD COLUMN data_encerramento date NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matriculas_encerramento_tipo_check'
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_encerramento_tipo_check
      CHECK (encerramento_tipo IS NULL OR encerramento_tipo IN ('CONCLUIDA','CANCELADA'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matriculas_encerramento_tipo ON public.matriculas (encerramento_tipo);

-- 3) Tabela de extrato (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.matriculas_encerramentos (
  id bigserial PRIMARY KEY,
  matricula_id bigint NOT NULL REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('CONCLUIDA','CANCELADA')),
  motivo text NOT NULL,
  realizado_em timestamptz NOT NULL DEFAULT now(),
  realizado_por_user_id uuid NULL,
  cobrancas_canceladas_qtd integer NOT NULL DEFAULT 0,
  cobrancas_canceladas_valor_centavos integer NOT NULL DEFAULT 0,
  payload jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_matriculas_encerramentos_matricula_id
  ON public.matriculas_encerramentos (matricula_id);

-- [FIM DO BLOCO]
