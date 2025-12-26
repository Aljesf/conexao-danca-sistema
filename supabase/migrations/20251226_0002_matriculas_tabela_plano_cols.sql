BEGIN;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS data_inicio_vinculo DATE NULL;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS tabela_matricula_id BIGINT NULL;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS plano_pagamento_id BIGINT NULL;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS vencimento_dia_padrao INT NULL DEFAULT 12;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_tabela_matricula_fk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_tabela_matricula_fk
      FOREIGN KEY (tabela_matricula_id)
      REFERENCES public.matricula_tabelas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_plano_pagamento_fk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_plano_pagamento_fk
      FOREIGN KEY (plano_pagamento_id)
      REFERENCES public.matricula_planos_pagamento(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_vencimento_dia_chk'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_vencimento_dia_chk
      CHECK (vencimento_dia_padrao BETWEEN 1 AND 28);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matriculas_data_inicio_vinculo
  ON public.matriculas (data_inicio_vinculo);

CREATE INDEX IF NOT EXISTS idx_matriculas_tabela_matricula_id
  ON public.matriculas (tabela_matricula_id);

CREATE INDEX IF NOT EXISTS idx_matriculas_plano_pagamento_id
  ON public.matriculas (plano_pagamento_id);

COMMIT;
