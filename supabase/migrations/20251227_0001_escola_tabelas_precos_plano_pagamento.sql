-- Conexão Dança — Matrículas
-- Etapa SQL (MVP): Tabela de Preços — Cursos (Escola) + Plano de Pagamento + colunas na matrícula
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-----------------------------------------------------------
-- A) Tabela de Preços — Cursos (Escola)
-----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.escola_tabelas_precos_cursos (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo                  text NOT NULL,
  ano_referencia          integer,
  referencia_tipo         text,        -- opcional: TURMA | CURSO | PROJETO | OUTRO (uso futuro)
  referencia_id           bigint,      -- opcional: id da entidade referenciada
  ativo                   boolean NOT NULL DEFAULT true,
  observacoes             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escola_tabelas_precos_cursos_ano
  ON public.escola_tabelas_precos_cursos (ano_referencia);

CREATE INDEX IF NOT EXISTS idx_escola_tabelas_precos_cursos_ref
  ON public.escola_tabelas_precos_cursos (referencia_tipo, referencia_id);

CREATE TABLE IF NOT EXISTS public.escola_tabelas_precos_cursos_itens (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela_id               bigint NOT NULL REFERENCES public.escola_tabelas_precos_cursos(id) ON DELETE CASCADE,
  codigo                  text NOT NULL,     -- ex.: MENSALIDADE, TAXA_MATRICULA, PROJETO, FIGURINO
  descricao               text,
  valor_centavos          integer NOT NULL CHECK (valor_centavos >= 0),
  moeda                   text NOT NULL DEFAULT 'BRL',
  ativo                   boolean NOT NULL DEFAULT true,
  ordem                   integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escola_tabelas_precos_cursos_itens_tabela
  ON public.escola_tabelas_precos_cursos_itens (tabela_id);

CREATE INDEX IF NOT EXISTS idx_escola_tabelas_precos_cursos_itens_codigo
  ON public.escola_tabelas_precos_cursos_itens (codigo);

-----------------------------------------------------------
-- B) Plano de Pagamento (MVP) — declarativo (sem execução financeira)
-----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.matricula_planos_pagamento (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome                    text NOT NULL,
  ativo                   boolean NOT NULL DEFAULT true,

  -- ciclo de cobrança (geração de cobranças; não é pagamento)
  ciclo_cobranca          text NOT NULL CHECK (
    ciclo_cobranca IN ('COBRANCA_UNICA', 'COBRANCA_EM_PARCELAS', 'COBRANCA_MENSAL')
  ),

  -- parcelas
  numero_parcelas         integer CHECK (numero_parcelas IS NULL OR numero_parcelas > 0),

  -- término (obrigatório quando mensal)
  termino_cobranca        text CHECK (
    termino_cobranca IS NULL OR termino_cobranca IN (
      'FIM_TURMA_CURSO', 'FIM_PROJETO', 'FIM_ANO_LETIVO', 'DATA_ESPECIFICA'
    )
  ),
  data_fim_manual         date,

  -- comportamento do total quando entra no meio
  regra_total_devido      text NOT NULL CHECK (
    regra_total_devido IN ('PROPORCIONAL', 'FIXO')
  ),

  -- pró-rata (apenas primeira cobrança)
  permite_prorrata        boolean NOT NULL DEFAULT false,

  -- ciclo financeiro (cronata/competência)
  ciclo_financeiro        text NOT NULL CHECK (
    ciclo_financeiro IN ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')
  ),

  -- forma de liquidação (declarativa; não executa)
  forma_liquidacao_padrao text,

  observacoes             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  ---------------------------------------------------------
  -- Constraints de consistência (evita combinações inválidas)
  ---------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_matricula_planos_pagamento_ativo
  ON public.matricula_planos_pagamento (ativo);

CREATE INDEX IF NOT EXISTS idx_matricula_planos_pagamento_ciclo
  ON public.matricula_planos_pagamento (ciclo_cobranca);

-----------------------------------------------------------
-- C) Ajustes na tabela matriculas (MVP: referências)
-----------------------------------------------------------

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS escola_tabela_preco_curso_id bigint,
  ADD COLUMN IF NOT EXISTS plano_pagamento_id bigint,
  ADD COLUMN IF NOT EXISTS forma_liquidacao_padrao text,
  ADD COLUMN IF NOT EXISTS contrato_modelo_id bigint;

-- FK para tabela de preços (Cursos - Escola)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_matriculas_escola_tabela_preco_curso'
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT fk_matriculas_escola_tabela_preco_curso
      FOREIGN KEY (escola_tabela_preco_curso_id)
      REFERENCES public.escola_tabelas_precos_cursos(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- FK para plano de pagamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_matriculas_plano_pagamento'
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT fk_matriculas_plano_pagamento
      FOREIGN KEY (plano_pagamento_id)
      REFERENCES public.matricula_planos_pagamento(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- FK condicional para contrato_modelo_id (se a tabela contratos_modelo existir)
DO $$
BEGIN
  IF to_regclass('public.contratos_modelo') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_matriculas_contrato_modelo'
    ) THEN
      ALTER TABLE public.matriculas
        ADD CONSTRAINT fk_matriculas_contrato_modelo
        FOREIGN KEY (contrato_modelo_id)
        REFERENCES public.contratos_modelo(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;
