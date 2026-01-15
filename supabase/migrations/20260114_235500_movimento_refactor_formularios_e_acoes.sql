-- Migracao: Movimento Conexao Danca - Formularios (A/B/C) + Acoes Sociais + extensao de beneficiarios
-- Objetivo:
-- - Preservar motor existente (creditos/regras/execucoes/financeiro)
-- - Evoluir beneficiarios e habilitar fluxos do modal do "coracao" (Acoes rapidas)

BEGIN;

-- =========================================================
-- 0) Enums necessarios (criando apenas se nao existirem)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimento_formulario_tipo') THEN
    CREATE TYPE public.movimento_formulario_tipo AS ENUM ('RESPONSAVEL_LEGAL', 'ALUNO_MENOR', 'ALUNO_MAIOR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimento_formulario_status') THEN
    CREATE TYPE public.movimento_formulario_status AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'DISPENSADO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimento_concessao_status') THEN
    CREATE TYPE public.movimento_concessao_status AS ENUM ('ATIVA', 'SUSPENSA', 'ENCERRADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimento_liquidacao_modelo') THEN
    CREATE TYPE public.movimento_liquidacao_modelo AS ENUM ('FAMILIA', 'MOVIMENTO', 'HIBRIDO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimento_acao_tipo') THEN
    CREATE TYPE public.movimento_acao_tipo AS ENUM ('CAMPANHA', 'DOACAO', 'INTERCAMBIO', 'ACOLHIMENTO', 'EVENTO', 'OUTRA');
  END IF;
END $$;

-- =========================================================
-- 1) EXTENSAO: public.movimento_beneficiarios (ja existe)
--    - Adiciona colunas para acionamento A/B/C e responsavel
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='responsavel_id'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN responsavel_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='eh_menor'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN eh_menor boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='acionar_form_responsavel'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN acionar_form_responsavel boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='acionar_form_aluno_menor'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN acionar_form_aluno_menor boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='acionar_form_aluno_maior'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN acionar_form_aluno_maior boolean NOT NULL DEFAULT false;
  END IF;

  -- padronizacao leve de auditoria (sem quebrar criado_em/criado_por ja existentes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='atualizado_em'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN atualizado_em timestamptz NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='atualizado_por'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios ADD COLUMN atualizado_por uuid NULL;
  END IF;
END $$;

-- Indices novos
CREATE INDEX IF NOT EXISTS idx_mov_beneficiarios_responsavel_id
  ON public.movimento_beneficiarios(responsavel_id);

-- FK opcional: so cria se public.pessoas(id) existir e for uuid
DO $$
DECLARE
  pessoas_id_is_uuid boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id'
  ) THEN
    SELECT (data_type = 'uuid') INTO pessoas_id_is_uuid
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id';

    IF pessoas_id_is_uuid THEN
      -- pessoa_id
      BEGIN
        ALTER TABLE public.movimento_beneficiarios
          ADD CONSTRAINT fk_mov_benef_pessoa
          FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN
        -- ignora
      END;

      -- responsavel_id
      BEGIN
        ALTER TABLE public.movimento_beneficiarios
          ADD CONSTRAINT fk_mov_benef_responsavel
          FOREIGN KEY (responsavel_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN
        -- ignora
      END;
    END IF;
  END IF;
END $$;

-- =========================================================
-- 2) NOVO: Concessoes (vinculo institucional do beneficiario)
--    - ponte conceitual entre beneficiario e seu motor de creditos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.movimento_concessoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      uuid NOT NULL REFERENCES public.movimento_beneficiarios(id) ON DELETE CASCADE,

  status               public.movimento_concessao_status NOT NULL DEFAULT 'ATIVA',
  data_inicio          date NOT NULL DEFAULT CURRENT_DATE,
  data_fim             date NULL,
  revisao_prevista_em  date NULL,

  modelo_liquidacao    public.movimento_liquidacao_modelo NOT NULL DEFAULT 'MOVIMENTO',
  percentual_movimento integer NOT NULL DEFAULT 100,
  percentual_familia   integer NOT NULL DEFAULT 0,

  justificativa        text NULL,

  autorizada_por       uuid NULL,
  autorizada_em        timestamptz NULL,

  criado_em            timestamptz NOT NULL DEFAULT now(),
  criado_por           uuid NULL,
  atualizado_em        timestamptz NULL,
  atualizado_por       uuid NULL,

  CONSTRAINT ck_mov_concessao_percentuais
    CHECK (
      percentual_movimento >= 0 AND percentual_movimento <= 100
      AND percentual_familia >= 0 AND percentual_familia <= 100
      AND (percentual_movimento + percentual_familia) = 100
    )
);

CREATE INDEX IF NOT EXISTS idx_mov_concessoes_beneficiario
  ON public.movimento_concessoes(beneficiario_id);

CREATE INDEX IF NOT EXISTS idx_mov_concessoes_status
  ON public.movimento_concessoes(status);

-- =========================================================
-- 3) NOVO: Modelos de Formulario (A/B/C) + Instancias + Respostas
-- =========================================================
CREATE TABLE IF NOT EXISTS public.movimento_formularios_modelo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        public.movimento_formulario_tipo NOT NULL,
  titulo      text NOT NULL,
  versao      text NOT NULL DEFAULT 'v1',
  ativo       boolean NOT NULL DEFAULT true,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  uuid NULL,
  atualizado_em timestamptz NULL,
  atualizado_por uuid NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_form_modelo_tipo_ativo
  ON public.movimento_formularios_modelo(tipo)
  WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.movimento_formularios_instancia (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id   uuid NOT NULL REFERENCES public.movimento_beneficiarios(id) ON DELETE CASCADE,
  modelo_id         uuid NOT NULL REFERENCES public.movimento_formularios_modelo(id) ON DELETE RESTRICT,

  tipo              public.movimento_formulario_tipo NOT NULL,
  status            public.movimento_formulario_status NOT NULL DEFAULT 'PENDENTE',

  respondente_pessoa_id uuid NULL, -- FK opcional (checada abaixo)
  iniciado_em       timestamptz NULL,
  concluido_em      timestamptz NULL,

  criado_em         timestamptz NOT NULL DEFAULT now(),
  criado_por        uuid NULL,
  atualizado_em     timestamptz NULL,
  atualizado_por    uuid NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_form_instancia_benef_tipo
  ON public.movimento_formularios_instancia(beneficiario_id, tipo);

CREATE INDEX IF NOT EXISTS idx_mov_form_inst_status
  ON public.movimento_formularios_instancia(status);

-- FK opcional respondente -> pessoas(id) se uuid
DO $$
DECLARE
  pessoas_id_is_uuid boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id'
  ) THEN
    SELECT (data_type = 'uuid') INTO pessoas_id_is_uuid
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id';

    IF pessoas_id_is_uuid THEN
      BEGIN
        ALTER TABLE public.movimento_formularios_instancia
          ADD CONSTRAINT fk_mov_form_inst_respondente
          FOREIGN KEY (respondente_pessoa_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN
      END;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.movimento_formularios_respostas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id  uuid NOT NULL REFERENCES public.movimento_formularios_instancia(id) ON DELETE CASCADE,
  respostas_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  enviado_em    timestamptz NOT NULL DEFAULT now(),
  enviado_por   uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_mov_form_resp_instancia
  ON public.movimento_formularios_respostas(instancia_id);

-- Seed minimo (A/B/C) se nao existir modelo ativo
INSERT INTO public.movimento_formularios_modelo (tipo, titulo, versao, ativo, schema_json)
SELECT 'RESPONSAVEL_LEGAL', 'Formulario A - Responsavel Legal', 'v1', true, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.movimento_formularios_modelo WHERE tipo='RESPONSAVEL_LEGAL' AND ativo=true
);

INSERT INTO public.movimento_formularios_modelo (tipo, titulo, versao, ativo, schema_json)
SELECT 'ALUNO_MENOR', 'Formulario B - Aluno (crianca/adolescente)', 'v1', true, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.movimento_formularios_modelo WHERE tipo='ALUNO_MENOR' AND ativo=true
);

INSERT INTO public.movimento_formularios_modelo (tipo, titulo, versao, ativo, schema_json)
SELECT 'ALUNO_MAIOR', 'Formulario C - Aluno (18+)', 'v1', true, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.movimento_formularios_modelo WHERE tipo='ALUNO_MAIOR' AND ativo=true
);

-- =========================================================
-- 4) NOVO: Acoes Sociais (card do coracao)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.movimento_acoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        public.movimento_acao_tipo NOT NULL DEFAULT 'OUTRA',
  titulo      text NOT NULL,
  descricao   text NULL,

  data_inicio date NULL,
  data_fim    date NULL,

  metricas_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  uuid NULL,
  atualizado_em timestamptz NULL,
  atualizado_por uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_mov_acoes_tipo
  ON public.movimento_acoes(tipo);

CREATE TABLE IF NOT EXISTS public.movimento_acao_participantes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id   uuid NOT NULL REFERENCES public.movimento_acoes(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL,
  papel     text NULL, -- BENEFICIARIO, VOLUNTARIO, DOADOR, EQUIPE
  observacoes text NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_acao_part_acoes
  ON public.movimento_acao_participantes(acao_id);

CREATE INDEX IF NOT EXISTS idx_mov_acao_part_pessoa
  ON public.movimento_acao_participantes(pessoa_id);

-- FK opcional pessoa_id -> pessoas(id) se uuid
DO $$
DECLARE
  pessoas_id_is_uuid boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id'
  ) THEN
    SELECT (data_type = 'uuid') INTO pessoas_id_is_uuid
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pessoas' AND column_name='id';

    IF pessoas_id_is_uuid THEN
      BEGIN
        ALTER TABLE public.movimento_acao_participantes
          ADD CONSTRAINT fk_mov_acao_part_pessoa
          FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN
      END;
    END IF;
  END IF;
END $$;

COMMIT;
