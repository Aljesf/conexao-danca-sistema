DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_em'
  ) THEN
    ALTER TABLE public.cobrancas
      ADD COLUMN cancelada_em timestamptz NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_motivo'
  ) THEN
    ALTER TABLE public.cobrancas
      ADD COLUMN cancelada_motivo text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cobrancas' AND column_name='cancelada_por_user_id'
  ) THEN
    ALTER TABLE public.cobrancas
      ADD COLUMN cancelada_por_user_id uuid NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cobrancas_cancelada_em
  ON public.cobrancas (cancelada_em);
