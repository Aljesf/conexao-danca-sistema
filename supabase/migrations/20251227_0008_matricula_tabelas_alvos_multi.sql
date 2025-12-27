-- Conexao Danca — Matriculas
-- Tabela de Precos: vinculos multi-alvo (TURMA / CURSO_LIVRE / WORKSHOP / PROJETO)
-- Migra dados do pivot antigo (matricula_tabelas_turmas) para o pivot novo
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- 1) Pivot generico
CREATE TABLE IF NOT EXISTS public.matricula_tabelas_alvos (
  id bigserial PRIMARY KEY,
  tabela_id bigint NOT NULL REFERENCES public.matricula_tabelas(id) ON DELETE CASCADE,
  alvo_tipo text NOT NULL,
  alvo_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_matricula_tabelas_alvos_tipo'
  ) THEN
    ALTER TABLE public.matricula_tabelas_alvos
      ADD CONSTRAINT chk_matricula_tabelas_alvos_tipo
      CHECK (alvo_tipo IN ('TURMA','CURSO_LIVRE','WORKSHOP','PROJETO'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_matricula_tabelas_alvos_tabela_tipo_id'
  ) THEN
    ALTER TABLE public.matricula_tabelas_alvos
      ADD CONSTRAINT uq_matricula_tabelas_alvos_tabela_tipo_id UNIQUE (tabela_id, alvo_tipo, alvo_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_alvos_tipo_id
  ON public.matricula_tabelas_alvos (alvo_tipo, alvo_id);

CREATE INDEX IF NOT EXISTS idx_matricula_tabelas_alvos_tabela
  ON public.matricula_tabelas_alvos (tabela_id);

-- 2) Migracao de dados do pivot antigo (TURMA)
-- Mantemos o pivot antigo por enquanto (compatibilidade), mas migramos seus dados para o novo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='matricula_tabelas_turmas'
  ) THEN
    INSERT INTO public.matricula_tabelas_alvos (tabela_id, alvo_tipo, alvo_id)
    SELECT p.tabela_id, 'TURMA', p.turma_id
    FROM public.matricula_tabelas_turmas p
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
