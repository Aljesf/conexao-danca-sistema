BEGIN;
-- Garantir que nada no banco exige ASE/formulario para criar beneficiario.
-- (Mudanca de regra: beneficiario do Movimento e cadastro manual.)

-- 1) Garantir colunas opcionais (caso alguem tenha tornado NOT NULL depois)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='movimento_beneficiarios'
      AND column_name='ase_submission_id'
      AND is_nullable='NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.movimento_beneficiarios ALTER COLUMN ase_submission_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='movimento_beneficiarios'
      AND column_name='ase_submitted_at'
      AND is_nullable='NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.movimento_beneficiarios ALTER COLUMN ase_submitted_at DROP NOT NULL';
  END IF;
END $$;
-- 2) Remover CHECK constraint que imponha ASE (se existir com qualquer nome conhecido)
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.movimento_beneficiarios'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%ase_submission_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.movimento_beneficiarios DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
-- 3) Remover trigger que bloqueie insert/update por ASE (se existir)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.movimento_beneficiarios'::regclass
      AND NOT tgisinternal
      AND (
        tgname ILIKE '%ase%'
        OR tgname ILIKE '%submission%'
        OR pg_get_triggerdef(oid) ILIKE '%ase_submission_id%'
        OR pg_get_triggerdef(oid) ILIKE '%form_submissions%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.movimento_beneficiarios', t.tgname);
  END LOOP;
END $$;
COMMIT;
