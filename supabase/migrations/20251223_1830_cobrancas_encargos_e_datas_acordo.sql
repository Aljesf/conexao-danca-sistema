-- =====================================================================================
-- Cobrancas - Encargos (multa/juros) + datas de acordo (prevista/incidencia)
-- Data: 2025-12-23
-- Objetivo:
-- - manter vencimento contratual fixo
-- - permitir "data prevista de pagamento" (acordo) sem mudar vencimento
-- - controlar "data de inicio de encargos" (incidencia de multa/juros)
-- - defaults em matricula_configuracoes
-- =====================================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Defaults contratuais (globais) do modulo de matriculas
-- -----------------------------------------------------------------------------

ALTER TABLE public.matricula_configuracoes
  ADD COLUMN IF NOT EXISTS multa_percentual_padrao NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS juros_mora_percentual_mensal_padrao NUMERIC(5,2) NOT NULL DEFAULT 1.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_config_multa_chk'
      AND conrelid = 'public.matricula_configuracoes'::regclass
  ) THEN
    ALTER TABLE public.matricula_configuracoes
      ADD CONSTRAINT matricula_config_multa_chk
      CHECK (multa_percentual_padrao >= 0 AND multa_percentual_padrao <= 2.00);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_config_juros_chk'
      AND conrelid = 'public.matricula_configuracoes'::regclass
  ) THEN
    ALTER TABLE public.matricula_configuracoes
      ADD CONSTRAINT matricula_config_juros_chk
      CHECK (juros_mora_percentual_mensal_padrao >= 0 AND juros_mora_percentual_mensal_padrao <= 10.00);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Cobrancas: datas de acordo + inicio de incidencia + percentuais aplicaveis
-- -----------------------------------------------------------------------------
-- Observacao:
-- - vencimento continua sendo o vencimento "contratual" (fixo).
-- - data_prevista_pagamento: data acordada para pagamento (nao muda vencimento).
-- - data_inicio_encargos: quando multa/juros comecam a incidir (pode ser igual a data prevista).
-- - multa/juros aplicaveis podem ser "congelados" na cobranca (override dos defaults globais).
-- -----------------------------------------------------------------------------

ALTER TABLE public.cobrancas
  ADD COLUMN IF NOT EXISTS data_prevista_pagamento DATE,
  ADD COLUMN IF NOT EXISTS data_inicio_encargos DATE,
  ADD COLUMN IF NOT EXISTS multa_percentual_aplicavel NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS juros_mora_percentual_mensal_aplicavel NUMERIC(5,2);

-- Defaults: se nao preencher, herda do comportamento da aplicacao:
-- - percentuais podem ser preenchidos na criacao da cobranca usando os defaults globais.
-- Aqui mantemos NULL para nao forcar comportamento retroativo em cobrancas antigas.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cobrancas_multa_aplicavel_chk'
      AND conrelid = 'public.cobrancas'::regclass
  ) THEN
    ALTER TABLE public.cobrancas
      ADD CONSTRAINT cobrancas_multa_aplicavel_chk
      CHECK (
        multa_percentual_aplicavel IS NULL
        OR (multa_percentual_aplicavel >= 0 AND multa_percentual_aplicavel <= 2.00)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cobrancas_juros_aplicavel_chk'
      AND conrelid = 'public.cobrancas'::regclass
  ) THEN
    ALTER TABLE public.cobrancas
      ADD CONSTRAINT cobrancas_juros_aplicavel_chk
      CHECK (
        juros_mora_percentual_mensal_aplicavel IS NULL
        OR (juros_mora_percentual_mensal_aplicavel >= 0 AND juros_mora_percentual_mensal_aplicavel <= 10.00)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cobrancas_datas_acordo_chk'
      AND conrelid = 'public.cobrancas'::regclass
  ) THEN
    ALTER TABLE public.cobrancas
      ADD CONSTRAINT cobrancas_datas_acordo_chk
      CHECK (
        (data_inicio_encargos IS NULL)
        OR (data_prevista_pagamento IS NULL)
        OR (data_inicio_encargos >= data_prevista_pagamento)
      );
  END IF;
END $$;

-- Indices uteis (nao sao obrigatorios, mas ajudam listagens e filtros)
CREATE INDEX IF NOT EXISTS idx_cobrancas_data_prevista_pagamento
  ON public.cobrancas (data_prevista_pagamento);
CREATE INDEX IF NOT EXISTS idx_cobrancas_data_inicio_encargos
  ON public.cobrancas (data_inicio_encargos);

COMMIT;
