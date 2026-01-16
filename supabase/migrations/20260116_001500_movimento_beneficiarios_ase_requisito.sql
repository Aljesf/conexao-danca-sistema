BEGIN;

ALTER TABLE public.movimento_beneficiarios
  ADD COLUMN IF NOT EXISTS ase_submission_id uuid NULL;

ALTER TABLE public.movimento_beneficiarios
  ADD COLUMN IF NOT EXISTS ase_submitted_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimento_beneficiarios_ase_submission_id_fkey'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios
      ADD CONSTRAINT movimento_beneficiarios_ase_submission_id_fkey
      FOREIGN KEY (ase_submission_id)
      REFERENCES public.form_submissions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mov_beneficiarios_ase_submission_id
  ON public.movimento_beneficiarios(ase_submission_id);

COMMIT;
