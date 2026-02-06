BEGIN;

-- 1) Garantir tabela base (se ja existir, nao faz nada)
CREATE TABLE IF NOT EXISTS public.movimento_beneficiarios (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 2) Garantir FK pessoa_id -> pessoas.id (se existir pessoas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name='pessoas'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.movimento_beneficiarios'::regclass
        AND contype = 'f'
        AND conname = 'movimento_beneficiarios_pessoa_id_fkey'
    ) THEN
      ALTER TABLE public.movimento_beneficiarios
        ADD CONSTRAINT movimento_beneficiarios_pessoa_id_fkey
        FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
        ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- 3) Garantir colunas do cadastro manual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='resumo_institucional'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN resumo_institucional text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='observacoes'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN observacoes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='exercicio_ano'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN exercicio_ano integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='valido_ate'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN valido_ate date;
  END IF;
END $$;

-- 4) Defaults (nao quebra historico)
UPDATE public.movimento_beneficiarios
SET exercicio_ano = EXTRACT(YEAR FROM NOW())::int
WHERE exercicio_ano IS NULL;

UPDATE public.movimento_beneficiarios
SET valido_ate = make_date(exercicio_ano, 12, 31)
WHERE valido_ate IS NULL AND exercicio_ano IS NOT NULL;

COMMIT;
