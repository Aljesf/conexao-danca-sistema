-- Conexão Dança — Matrículas
-- Backfill do pivot matricula_tabelas_turmas usando o legado:
--  (A) matricula_tabelas.turma_id (se existir)
--  (B) matricula_tabelas.referencia_tipo='TURMA' + referencia_id (se existir)
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- Backfill via matricula_tabelas.turma_id (se existir)
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

-- Backfill via referencia_tipo/referencia_id (se existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matricula_tabelas' AND column_name='referencia_tipo'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matricula_tabelas' AND column_name='referencia_id'
  ) THEN
    INSERT INTO public.matricula_tabelas_turmas (tabela_id, turma_id)
    SELECT mt.id, mt.referencia_id
    FROM public.matricula_tabelas mt
    WHERE mt.referencia_tipo = 'TURMA'
      AND mt.referencia_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
