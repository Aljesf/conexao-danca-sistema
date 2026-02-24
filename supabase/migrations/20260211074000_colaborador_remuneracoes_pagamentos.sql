BEGIN;
CREATE TABLE IF NOT EXISTS public.colaborador_remuneracoes (
  id bigserial PRIMARY KEY,
  colaborador_id bigint NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  vigencia_inicio date NOT NULL,
  vigencia_fim date NULL,
  salario_base_centavos integer NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'BRL',
  dia_pagamento_padrao smallint NULL,
  conta_financeira_padrao_id bigint NULL REFERENCES public.contas_financeiras(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaborador_remuneracoes_unica_ativa
  ON public.colaborador_remuneracoes (colaborador_id)
  WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_colaborador_remuneracoes_colaborador_vigencia
  ON public.colaborador_remuneracoes (colaborador_id, vigencia_inicio DESC);
CREATE TABLE IF NOT EXISTS public.colaborador_pagamentos (
  id bigserial PRIMARY KEY,
  colaborador_id bigint NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('PAGAMENTO','ADIANTAMENTO','SAQUE')),
  competencia_ano_mes text NULL,
  data_pagamento date NOT NULL,
  valor_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  conta_financeira_id bigint NULL REFERENCES public.contas_financeiras(id),
  observacoes text NULL,
  folha_pagamento_colaborador_id bigint NULL REFERENCES public.folha_pagamento_colaborador(id),
  folha_evento_id bigint NULL REFERENCES public.folha_pagamento_eventos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'colaborador_pagamentos_competencia_ano_mes_check'
  ) THEN
    ALTER TABLE public.colaborador_pagamentos
      ADD CONSTRAINT colaborador_pagamentos_competencia_ano_mes_check
      CHECK (
        competencia_ano_mes IS NULL
        OR competencia_ano_mes ~ '^[0-9]{4}-[0-9]{2}$'
      );
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_colaborador_pagamentos_colaborador_data
  ON public.colaborador_pagamentos (colaborador_id, data_pagamento DESC);
CREATE INDEX IF NOT EXISTS idx_colaborador_pagamentos_competencia
  ON public.colaborador_pagamentos (competencia_ano_mes);
COMMIT;
