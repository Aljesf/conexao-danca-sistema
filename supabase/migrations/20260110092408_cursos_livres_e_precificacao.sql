-- [INICIO DO BLOCO] supabase/migrations/<timestamp>_cursos_livres_e_precificacao.sql

-- ============================
-- 1) Cursos Livres (agrupador)
-- ============================
CREATE TABLE IF NOT EXISTS public.cursos_livres (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  classificacao text NOT NULL DEFAULT 'WORKSHOP',
  descricao text NULL,
  publico_alvo text NULL,
  data_inicio date NULL,
  data_fim date NULL,
  status text NOT NULL DEFAULT 'RASCUNHO',
  idade_minima integer NULL,
  idade_maxima integer NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_cursos_livres_status ON public.cursos_livres(status);
CREATE INDEX IF NOT EXISTS idx_cursos_livres_datas ON public.cursos_livres(data_inicio, data_fim);
-- ==========================================
-- 2) Turmas: vinculo opcional com Curso Livre
-- ==========================================
-- Reuso da tabela turmas como unidade de execucao (modalidade).
-- Uma turma CURSO_LIVRE pode apontar para um curso_livre (agrupador).
ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS curso_livre_id bigint NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turmas_curso_livre_id_fkey'
  ) THEN
    ALTER TABLE public.turmas
    ADD CONSTRAINT turmas_curso_livre_id_fkey
    FOREIGN KEY (curso_livre_id) REFERENCES public.cursos_livres(id)
    ON DELETE SET NULL;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_turmas_curso_livre_id ON public.turmas(curso_livre_id);
-- ==========================================
-- 3) Precificacao - tabela de precos (1 ativa)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.escola_precos_cursos_livres (
  id bigserial PRIMARY KEY,
  curso_livre_id bigint NOT NULL REFERENCES public.cursos_livres(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  ano_referencia integer NULL,
  ativo boolean NOT NULL DEFAULT false,
  regras_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_escola_precos_cl_curso ON public.escola_precos_cursos_livres(curso_livre_id);
CREATE INDEX IF NOT EXISTS idx_escola_precos_cl_ativo ON public.escola_precos_cursos_livres(curso_livre_id, ativo);
-- Garantir 1 tabela ativa por curso_livre
CREATE UNIQUE INDEX IF NOT EXISTS ux_escola_precos_cl_ativo_por_curso
ON public.escola_precos_cursos_livres(curso_livre_id)
WHERE ativo = true;
-- ==========================================
-- 4) Precificacao - itens/tiers
-- ==========================================
CREATE TABLE IF NOT EXISTS public.escola_precos_cursos_livres_itens (
  id bigserial PRIMARY KEY,
  tabela_preco_id bigint NOT NULL REFERENCES public.escola_precos_cursos_livres(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text NULL,
  qtd_turmas integer NULL,
  qtd_pessoas integer NULL,
  valor_centavos integer NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_escola_precos_cl_itens_tabela ON public.escola_precos_cursos_livres_itens(tabela_preco_id);
CREATE INDEX IF NOT EXISTS idx_escola_precos_cl_itens_ativo ON public.escola_precos_cursos_livres_itens(tabela_preco_id, ativo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_escola_precos_cl_itens_codigo
ON public.escola_precos_cursos_livres_itens(tabela_preco_id, codigo);
-- [FIM DO BLOCO];
