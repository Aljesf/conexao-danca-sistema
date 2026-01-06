-- 20260106_02_pessoas_cuidados_observacoes.sql
-- Objetivo:
--  - Ficha de cuidados por pessoa (preenchivel antes da matricula)
--  - Autorizados de saida por FK em pessoas
--  - Medidas declaradas (manual) por historico
--  - Observacoes gerais tabeladas
--  - Observacoes pedagogicas (historico), base para diario de classe futuro

BEGIN;

-- 1) Cuidados (cabecalho)
CREATE TABLE IF NOT EXISTS public.pessoa_cuidados (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,

  -- saude/historico
  historico_lesoes text NULL,
  restricoes_fisicas text NULL,
  condicoes_neuro text NULL,
  tipo_sanguineo text NULL, -- validar na API/UI

  -- alergias
  alergias_alimentares text NULL,
  alergias_medicamentos text NULL,
  alergias_produtos text NULL,

  -- alimentacao em eventos/aula
  pode_consumir_acucar text NULL,       -- PODE | EVITAR | NAO_PODE
  pode_consumir_refrigerante text NULL, -- PODE | EVITAR | NAO_PODE
  restricoes_alimentares_observacoes text NULL,

  -- saida
  tipo_autorizacao_saida text NULL, -- enum logico na API/UI

  -- contato de emergencia via FK pessoa
  contato_emergencia_pessoa_id bigint NULL REFERENCES public.pessoas(id) ON DELETE SET NULL,
  contato_emergencia_relacao text NULL,
  contato_emergencia_observacao text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.1) Garantir 1 registro de cuidados por pessoa (upsert)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pessoa_cuidados_pessoa
  ON public.pessoa_cuidados(pessoa_id);

-- 2) Autorizados a buscar (somente quando tipo exigir)
CREATE TABLE IF NOT EXISTS public.pessoa_cuidados_autorizados_busca (
  id bigserial PRIMARY KEY,
  pessoa_cuidados_id bigint NOT NULL REFERENCES public.pessoa_cuidados(id) ON DELETE CASCADE,
  pessoa_autorizada_id bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  parentesco text NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_cuidados_autorizados_cuidados
  ON public.pessoa_cuidados_autorizados_busca(pessoa_cuidados_id);

-- evita duplicar a mesma pessoa na mesma ficha
CREATE UNIQUE INDEX IF NOT EXISTS ux_cuidados_autorizados_unico
  ON public.pessoa_cuidados_autorizados_busca(pessoa_cuidados_id, pessoa_autorizada_id);

-- 3) Medidas declaradas (manual) por historico
CREATE TABLE IF NOT EXISTS public.pessoa_medidas_declaradas (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  categoria text NOT NULL, -- ex: "camisa", "uniforme", "calcado", "collant"
  tamanho text NOT NULL,   -- texto para flexibilidade
  data_referencia date NULL,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pessoa_medidas_pessoa
  ON public.pessoa_medidas_declaradas(pessoa_id);

-- 4) Observacoes gerais tabeladas
CREATE TABLE IF NOT EXISTS public.pessoa_observacoes (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  natureza text NOT NULL, -- categoria
  titulo text NULL,
  descricao text NOT NULL,
  data_referencia date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pessoa_observacoes_pessoa
  ON public.pessoa_observacoes(pessoa_id);

-- 5) Observacoes pedagogicas (historico, base para diario de classe)
CREATE TABLE IF NOT EXISTS public.pessoa_observacoes_pedagogicas (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  observado_em timestamptz NOT NULL DEFAULT now(),
  professor_pessoa_id bigint NULL REFERENCES public.pessoas(id) ON DELETE SET NULL,
  titulo text NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pessoa_obs_ped_pessoa
  ON public.pessoa_observacoes_pedagogicas(pessoa_id);

CREATE INDEX IF NOT EXISTS ix_pessoa_obs_ped_professor
  ON public.pessoa_observacoes_pedagogicas(professor_pessoa_id);

COMMIT;
