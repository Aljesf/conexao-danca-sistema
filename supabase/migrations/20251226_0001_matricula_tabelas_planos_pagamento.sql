BEGIN;

CREATE TABLE IF NOT EXISTS public.matricula_tabelas (
  id BIGSERIAL PRIMARY KEY,
  produto_tipo TEXT NOT NULL,
  referencia_tipo TEXT NOT NULL,
  referencia_id BIGINT NULL,
  ano_referencia INT NULL,
  titulo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_tabelas_produto_tipo_chk'
      AND conrelid = 'public.matricula_tabelas'::regclass
  ) THEN
    ALTER TABLE public.matricula_tabelas
      ADD CONSTRAINT matricula_tabelas_produto_tipo_chk
      CHECK (produto_tipo IN ('REGULAR', 'CURSO_LIVRE', 'PROJETO_ARTISTICO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_tabelas_referencia_tipo_chk'
      AND conrelid = 'public.matricula_tabelas'::regclass
  ) THEN
    ALTER TABLE public.matricula_tabelas
      ADD CONSTRAINT matricula_tabelas_referencia_tipo_chk
      CHECK (referencia_tipo IN ('TURMA', 'PRODUTO', 'PROJETO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_ativo
  ON public.matricula_tabelas (ativo);

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_produto_ano
  ON public.matricula_tabelas (produto_tipo, ano_referencia);

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_referencia
  ON public.matricula_tabelas (referencia_tipo, referencia_id, ano_referencia);

CREATE TABLE IF NOT EXISTS public.matricula_tabela_itens (
  id BIGSERIAL PRIMARY KEY,
  tabela_id BIGINT NOT NULL REFERENCES public.matricula_tabelas(id) ON DELETE CASCADE,
  codigo_item TEXT NOT NULL,
  descricao TEXT NULL,
  tipo_item TEXT NOT NULL,
  valor_centavos INT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_tabela_itens_tipo_item_chk'
      AND conrelid = 'public.matricula_tabela_itens'::regclass
  ) THEN
    ALTER TABLE public.matricula_tabela_itens
      ADD CONSTRAINT matricula_tabela_itens_tipo_item_chk
      CHECK (tipo_item IN ('RECORRENTE', 'UNICO', 'EVENTUAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_tabela_itens_valor_chk'
      AND conrelid = 'public.matricula_tabela_itens'::regclass
  ) THEN
    ALTER TABLE public.matricula_tabela_itens
      ADD CONSTRAINT matricula_tabela_itens_valor_chk
      CHECK (valor_centavos >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_tabela_itens_tabela_codigo_uniq'
      AND conrelid = 'public.matricula_tabela_itens'::regclass
  ) THEN
    ALTER TABLE public.matricula_tabela_itens
      ADD CONSTRAINT matricula_tabela_itens_tabela_codigo_uniq
      UNIQUE (tabela_id, codigo_item);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_tabela_itens_ativo
  ON public.matricula_tabela_itens (tabela_id, ativo);

CREATE TABLE IF NOT EXISTS public.matricula_planos_pagamento (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  periodicidade TEXT NOT NULL,
  numero_parcelas INT NULL,
  permite_prorata BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_planos_pagamento_periodicidade_chk'
      AND conrelid = 'public.matricula_planos_pagamento'::regclass
  ) THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT matricula_planos_pagamento_periodicidade_chk
      CHECK (periodicidade IN ('MENSAL', 'TRIMESTRAL', 'AVISTA', 'OUTRA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matricula_planos_pagamento_parcelas_chk'
      AND conrelid = 'public.matricula_planos_pagamento'::regclass
  ) THEN
    ALTER TABLE public.matricula_planos_pagamento
      ADD CONSTRAINT matricula_planos_pagamento_parcelas_chk
      CHECK (numero_parcelas IS NULL OR numero_parcelas > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_planos_pagamento_ativo
  ON public.matricula_planos_pagamento (ativo);

COMMIT;
