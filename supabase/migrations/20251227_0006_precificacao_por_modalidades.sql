-- Conexão Dança — Matrículas
-- Precificação por quantidade de modalidades (tiers) + Grupo Financeiro do aluno
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- 1) Grupo financeiro (assinatura/pacote) por aluno/ano
CREATE TABLE IF NOT EXISTS public.matricula_grupos_financeiros (
  id bigserial PRIMARY KEY,
  aluno_id bigint NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  responsavel_financeiro_id bigint NULL REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ano_referencia int NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_matricula_grupos_financeiros_aluno_ano'
  ) THEN
    ALTER TABLE public.matricula_grupos_financeiros
      ADD CONSTRAINT uq_matricula_grupos_financeiros_aluno_ano UNIQUE (aluno_id, ano_referencia);
  END IF;
END $$;

-- 2) Vínculo da matrícula ao grupo financeiro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas' AND column_name='grupo_financeiro_id'
  ) THEN
    ALTER TABLE public.matriculas
      ADD COLUMN grupo_financeiro_id bigint NULL REFERENCES public.matricula_grupos_financeiros(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matriculas_grupo_financeiro_id
  ON public.matriculas (grupo_financeiro_id);

-- 3) Política de precificação por modalidade (tiers) vinculada à tabela de preços
CREATE TABLE IF NOT EXISTS public.matricula_tabelas_precificacao_tiers (
  id bigserial PRIMARY KEY,
  tabela_id bigint NOT NULL REFERENCES public.matricula_tabelas(id) ON DELETE CASCADE,
  minimo_modalidades int NOT NULL,
  maximo_modalidades int NULL,
  item_codigo text NOT NULL,
  tipo_item text NOT NULL DEFAULT 'RECORRENTE',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_matricula_tabelas_precificacao_tiers_tipo_item'
  ) THEN
    ALTER TABLE public.matricula_tabelas_precificacao_tiers
      ADD CONSTRAINT chk_matricula_tabelas_precificacao_tiers_tipo_item
      CHECK (tipo_item IN ('RECORRENTE','UNICO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_precificacao_tiers_tabela
  ON public.matricula_tabelas_precificacao_tiers (tabela_id);

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_precificacao_tiers_minmax
  ON public.matricula_tabelas_precificacao_tiers (minimo_modalidades, maximo_modalidades);

COMMIT;
