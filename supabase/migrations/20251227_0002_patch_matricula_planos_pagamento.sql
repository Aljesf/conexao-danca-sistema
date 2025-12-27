-- Conexão Dança — Matrículas
-- Patch: garantir colunas/constraints do Plano de Pagamento (mesmo se a tabela já existir)
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-----------------------------------------------------------
-- 1) Garantir que a tabela exista (se não existir, cria)
-----------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.matricula_planos_pagamento') IS NULL THEN
    CREATE TABLE public.matricula_planos_pagamento (
      id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nome                    text NOT NULL,
      ativo                   boolean NOT NULL DEFAULT true,

      ciclo_cobranca          text NOT NULL CHECK (
        ciclo_cobranca IN ('COBRANCA_UNICA', 'COBRANCA_EM_PARCELAS', 'COBRANCA_MENSAL')
      ),

      numero_parcelas         integer CHECK (numero_parcelas IS NULL OR numero_parcelas > 0),

      termino_cobranca        text CHECK (
        termino_cobranca IS NULL OR termino_cobranca IN (
          'FIM_TURMA_CURSO', 'FIM_PROJETO', 'FIM_ANO_LETIVO', 'DATA_ESPECIFICA'
        )
      ),
      data_fim_manual         date,

      regra_total_devido      text NOT NULL CHECK (regra_total_devido IN ('PROPORCIONAL', 'FIXO')),
      permite_prorrata        boolean NOT NULL DEFAULT false,

      ciclo_financeiro        text NOT NULL CHECK (
        ciclo_financeiro IN ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')
      ),

      forma_liquidacao_padrao text,
      observacoes             text,
      created_at              timestamptz NOT NULL DEFAULT now(),
      updated_at              timestamptz NOT NULL DEFAULT now(),

      CONSTRAINT chk_plano_parcelas_obrigatorio
        CHECK (
          ciclo_cobranca <> 'COBRANCA_EM_PARCELAS'
          OR (numero_parcelas IS NOT NULL AND numero_parcelas > 0)
        ),

      CONSTRAINT chk_plano_mensal_termino_obrigatorio
        CHECK (
          ciclo_cobranca <> 'COBRANCA_MENSAL'
          OR (termino_cobranca IS NOT NULL)
        ),

      CONSTRAINT chk_plano_data_especifica_exige_data
        CHECK (
          termino_cobranca <> 'DATA_ESPECIFICA'
          OR data_fim_manual IS NOT NULL
        ),

      CONSTRAINT chk_plano_unica_sem_campos_extras
        CHECK (
          ciclo_cobranca <> 'COBRANCA_UNICA'
          OR (numero_parcelas IS NULL AND termino_cobranca IS NULL AND data_fim_manual IS NULL)
        )
    );
  END IF;
END $$;

-----------------------------------------------------------
-- 2) Se a tabela já existe, garantir colunas (ALTER TABLE)
-----------------------------------------------------------

ALTER TABLE public.matricula_planos_pagamento
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ciclo_cobranca text,
  ADD COLUMN IF NOT EXISTS numero_parcelas integer,
  ADD COLUMN IF NOT EXISTS termino_cobranca text,
  ADD COLUMN IF NOT EXISTS data_fim_manual date,
  ADD COLUMN IF NOT EXISTS regra_total_devido text,
  ADD COLUMN IF NOT EXISTS permite_prorrata boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciclo_financeiro text,
  ADD COLUMN IF NOT EXISTS forma_liquidacao_padrao text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Preencher defaults mínimos (caso exista dado antigo)
UPDATE public.matricula_planos_pagamento
SET
  ativo = COALESCE(ativo, true),
  permite_prorrata = COALESCE(permite_prorrata, false),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE true;

-- Se ainda houver NULLs críticos, manter permissivo por enquanto e reforçar via API.
-- Se a tabela estiver vazia, você pode aplicar NOT NULL sem risco:
-- (vamos aplicar de forma segura: só se não houver linhas com NULL)

DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls
  FROM public.matricula_planos_pagamento
  WHERE nome IS NULL;

  IF v_nulls = 0 THEN
    ALTER TABLE public.matricula_planos_pagamento
      ALTER COLUMN nome SET NOT NULL;
  END IF;

  SELECT COUNT(*) INTO v_nulls
  FROM public.matricula_planos_pagamento
  WHERE ciclo_cobranca IS NULL;

  IF v_nulls = 0 THEN
    ALTER TABLE public.matricula_planos_pagamento
      ALTER COLUMN ciclo_cobranca SET NOT NULL;
  END IF;

  SELECT COUNT(*) INTO v_nulls
  FROM public.matricula_planos_pagamento
  WHERE regra_total_devido IS NULL;

  IF v_nulls = 0 THEN
    ALTER TABLE public.matricula_planos_pagamento
      ALTER COLUMN regra_total_devido SET NOT NULL;
  END IF;

  SELECT COUNT(*) INTO v_nulls
  FROM public.matricula_planos_pagamento
  WHERE ciclo_financeiro IS NULL;

  IF v_nulls = 0 THEN
    ALTER TABLE public.matricula_planos_pagamento
      ALTER COLUMN ciclo_financeiro SET NOT NULL;
  END IF;
END $$;

-----------------------------------------------------------
-- 3) Garantir CHECK constraints (caso existam dados antigos, adicionar só se faltar)
-----------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_parcelas_obrigatorio') THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT chk_plano_parcelas_obrigatorio
      CHECK (
        ciclo_cobranca <> 'COBRANCA_EM_PARCELAS'
        OR (numero_parcelas IS NOT NULL AND numero_parcelas > 0)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_mensal_termino_obrigatorio') THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT chk_plano_mensal_termino_obrigatorio
      CHECK (
        ciclo_cobranca <> 'COBRANCA_MENSAL'
        OR (termino_cobranca IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_data_especifica_exige_data') THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT chk_plano_data_especifica_exige_data
      CHECK (
        termino_cobranca <> 'DATA_ESPECIFICA'
        OR data_fim_manual IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plano_unica_sem_campos_extras') THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT chk_plano_unica_sem_campos_extras
      CHECK (
        ciclo_cobranca <> 'COBRANCA_UNICA'
        OR (numero_parcelas IS NULL AND termino_cobranca IS NULL AND data_fim_manual IS NULL)
      );
  END IF;
END $$;

-----------------------------------------------------------
-- 4) Garantir índices úteis
-----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_matricula_planos_pagamento_ativo
  ON public.matricula_planos_pagamento (ativo);

CREATE INDEX IF NOT EXISTS idx_matricula_planos_pagamento_ciclo
  ON public.matricula_planos_pagamento (ciclo_cobranca);

COMMIT;