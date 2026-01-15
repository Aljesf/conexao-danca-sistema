BEGIN;

-- =========================================================
-- Tabela: movimento_analises_socioeconomicas
-- Registro historico datado, vinculado a pessoa (aluno)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.movimento_analises_socioeconomicas (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id                  bigint NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  responsavel_legal_pessoa_id bigint NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  data_analise               date NOT NULL DEFAULT CURRENT_DATE,
  contexto                   text NOT NULL CHECK (contexto IN ('ASE_18_PLUS','ASE_MENOR')),
  registrado_por_user_id     uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status                     text NOT NULL DEFAULT 'RASCUNHO'
                            CHECK (status IN ('RASCUNHO','CONCLUIDA','REVISADA')),
  respostas_json             jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado_status           text NULL CHECK (resultado_status IN ('NECESSITA_APOIO','APOIO_PARCIAL','SEM_APOIO')),
  observacao_institucional   text NULL,
  data_sugerida_revisao      date NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_ase_pessoa
  ON public.movimento_analises_socioeconomicas(pessoa_id);

CREATE INDEX IF NOT EXISTS idx_mov_ase_contexto
  ON public.movimento_analises_socioeconomicas(contexto);

CREATE INDEX IF NOT EXISTS idx_mov_ase_status
  ON public.movimento_analises_socioeconomicas(status);

CREATE INDEX IF NOT EXISTS idx_mov_ase_data
  ON public.movimento_analises_socioeconomicas(data_analise);

-- Trigger updated_at (se existir funcao padrao no projeto)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_mov_ase_set_updated_at ON public.movimento_analises_socioeconomicas;
    CREATE TRIGGER trg_mov_ase_set_updated_at
    BEFORE UPDATE ON public.movimento_analises_socioeconomicas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- =========================================================
-- Extensao: movimento_beneficiarios
-- Beneficiario deve apontar para uma analise existente
-- =========================================================
ALTER TABLE IF EXISTS public.movimento_beneficiarios
  ADD COLUMN IF NOT EXISTS analise_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimento_beneficiarios_analise_id_fkey'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios
      ADD CONSTRAINT movimento_beneficiarios_analise_id_fkey
      FOREIGN KEY (analise_id)
      REFERENCES public.movimento_analises_socioeconomicas(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mov_benef_analise_id
  ON public.movimento_beneficiarios(analise_id);

-- Garantir coerencia: analise_id deve ser da mesma pessoa_id
CREATE OR REPLACE FUNCTION public.movimento_beneficiarios_validar_analise_pessoa()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_pessoa_id bigint;
BEGIN
  IF NEW.analise_id IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'analise_id obrigatorio para cadastro de beneficiario.';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.analise_id IS NOT NULL THEN
      RAISE EXCEPTION 'analise_id nao pode ser removido de beneficiario existente.';
    END IF;
    RETURN NEW;
  END IF;

  SELECT pessoa_id INTO v_pessoa_id
  FROM public.movimento_analises_socioeconomicas
  WHERE id = NEW.analise_id;

  IF v_pessoa_id IS NULL THEN
    RAISE EXCEPTION 'Analise socioeconomica nao encontrada: %', NEW.analise_id;
  END IF;

  IF v_pessoa_id <> NEW.pessoa_id THEN
    RAISE EXCEPTION 'Analise (%) nao pertence a pessoa_id (%). Pertence a (%).',
      NEW.analise_id, NEW.pessoa_id, v_pessoa_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mov_benef_validar_analise_pessoa ON public.movimento_beneficiarios;
CREATE TRIGGER trg_mov_benef_validar_analise_pessoa
BEFORE INSERT OR UPDATE ON public.movimento_beneficiarios
FOR EACH ROW EXECUTE FUNCTION public.movimento_beneficiarios_validar_analise_pessoa();

-- Unicidade por pessoa (somente se nao houver duplicidade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_mov_benef_pessoa'
  ) THEN
    IF NOT EXISTS (
      SELECT pessoa_id
      FROM public.movimento_beneficiarios
      GROUP BY pessoa_id
      HAVING COUNT(*) > 1
      LIMIT 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_mov_benef_pessoa ON public.movimento_beneficiarios(pessoa_id)';
    END IF;
  END IF;
END $$;

COMMIT;
