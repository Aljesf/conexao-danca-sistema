-- 20260106_0310_rls_cursos_niveis.sql
-- Objetivo:
-- - Habilitar RLS em cursos e niveis
-- - Politicas minimas para authenticated (sem filtro por contexto)

BEGIN;

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cursos'
      AND policyname = 'cursos_select_authenticated'
  ) THEN
    CREATE POLICY cursos_select_authenticated
      ON public.cursos
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cursos'
      AND policyname = 'cursos_insert_authenticated'
  ) THEN
    CREATE POLICY cursos_insert_authenticated
      ON public.cursos
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cursos'
      AND policyname = 'cursos_update_authenticated'
  ) THEN
    CREATE POLICY cursos_update_authenticated
      ON public.cursos
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cursos'
      AND policyname = 'cursos_delete_authenticated'
  ) THEN
    CREATE POLICY cursos_delete_authenticated
      ON public.cursos
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'niveis'
      AND policyname = 'niveis_select_authenticated'
  ) THEN
    CREATE POLICY niveis_select_authenticated
      ON public.niveis
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'niveis'
      AND policyname = 'niveis_insert_authenticated'
  ) THEN
    CREATE POLICY niveis_insert_authenticated
      ON public.niveis
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'niveis'
      AND policyname = 'niveis_update_authenticated'
  ) THEN
    CREATE POLICY niveis_update_authenticated
      ON public.niveis
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'niveis'
      AND policyname = 'niveis_delete_authenticated'
  ) THEN
    CREATE POLICY niveis_delete_authenticated
      ON public.niveis
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

COMMIT;
