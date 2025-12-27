-- Conexão Dança — Matrículas
-- Permitir uma Tabela de Preços (matrícula) ser aplicada a múltiplas Turmas via pivot
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- 1) Pivot: matricula_tabelas_turmas
CREATE TABLE IF NOT EXISTS public.matricula_tabelas_turmas (
  id bigserial PRIMARY KEY,
  tabela_id bigint NOT NULL REFERENCES public.matricula_tabelas(id) ON DELETE CASCADE,
  turma_id bigint NOT NULL REFERENCES public.turmas(turma_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_matricula_tabelas_turmas_tabela_turma'
  ) THEN
    ALTER TABLE public.matricula_tabelas_turmas
      ADD CONSTRAINT uq_matricula_tabelas_turmas_tabela_turma UNIQUE (tabela_id, turma_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_turmas_turma_id
  ON public.matricula_tabelas_turmas (turma_id);

-- 2) Backfill (se existir coluna legada turma_id em matricula_tabelas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matricula_tabelas' AND column_name='turma_id'
  ) THEN
    INSERT INTO public.matricula_tabelas_turmas (tabela_id, turma_id)
    SELECT mt.id, mt.turma_id
    FROM public.matricula_tabelas mt
    WHERE mt.turma_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3) Backfill a partir de referencia_id (modelo atual)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matricula_tabelas' AND column_name='referencia_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matricula_tabelas' AND column_name='referencia_tipo'
  ) THEN
    INSERT INTO public.matricula_tabelas_turmas (tabela_id, turma_id)
    SELECT mt.id, mt.referencia_id
    FROM public.matricula_tabelas mt
    WHERE mt.referencia_id IS NOT NULL
      AND mt.referencia_tipo = 'TURMA'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
