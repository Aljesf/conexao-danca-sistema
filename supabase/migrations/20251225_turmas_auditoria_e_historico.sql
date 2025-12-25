BEGIN;

-- ------------------------------------------------------
-- Auditoria base: created_at / updated_at (+ optional by)
-- ------------------------------------------------------
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.turmas
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.turmas
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.turmas
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.turmas
SET updated_at = now()
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  BEGIN
    NEW.updated_by = auth.uid();
  EXCEPTION WHEN others THEN
    -- auth.uid() may be unavailable in some contexts
    NULL;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'turmas'
      AND t.tgname = 'trg_turmas_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_turmas_set_updated_at
    BEFORE UPDATE ON public.turmas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------
-- Historico real: turmas_historico
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turmas_historico (
  id bigserial PRIMARY KEY,
  turma_id bigint NOT NULL REFERENCES public.turmas(turma_id) ON DELETE CASCADE,
  ocorrida_em timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL,
  evento text NOT NULL,
  resumo text NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NULL
);

CREATE INDEX IF NOT EXISTS turmas_historico_turma_id_idx
  ON public.turmas_historico (turma_id, ocorrida_em DESC);

CREATE OR REPLACE FUNCTION public.log_turmas_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
  v_diff jsonb := '{}'::jsonb;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;

  IF (OLD.nome IS DISTINCT FROM NEW.nome) THEN
    v_diff := v_diff || jsonb_build_object(
      'nome', jsonb_build_object('old', OLD.nome, 'new', NEW.nome)
    );
  END IF;

  IF (OLD.curso IS DISTINCT FROM NEW.curso) THEN
    v_diff := v_diff || jsonb_build_object(
      'curso', jsonb_build_object('old', OLD.curso, 'new', NEW.curso)
    );
  END IF;

  IF (OLD.nivel IS DISTINCT FROM NEW.nivel) THEN
    v_diff := v_diff || jsonb_build_object(
      'nivel', jsonb_build_object('old', OLD.nivel, 'new', NEW.nivel)
    );
  END IF;

  IF (OLD.tipo_turma IS DISTINCT FROM NEW.tipo_turma) THEN
    v_diff := v_diff || jsonb_build_object(
      'tipo_turma', jsonb_build_object('old', OLD.tipo_turma, 'new', NEW.tipo_turma)
    );
  END IF;

  IF (OLD.turno IS DISTINCT FROM NEW.turno) THEN
    v_diff := v_diff || jsonb_build_object(
      'turno', jsonb_build_object('old', OLD.turno, 'new', NEW.turno)
    );
  END IF;

  IF (OLD.ano_referencia IS DISTINCT FROM NEW.ano_referencia) THEN
    v_diff := v_diff || jsonb_build_object(
      'ano_referencia', jsonb_build_object('old', OLD.ano_referencia, 'new', NEW.ano_referencia)
    );
  END IF;

  IF (OLD.capacidade IS DISTINCT FROM NEW.capacidade) THEN
    v_diff := v_diff || jsonb_build_object(
      'capacidade', jsonb_build_object('old', OLD.capacidade, 'new', NEW.capacidade)
    );
  END IF;

  IF (OLD.dias_semana IS DISTINCT FROM NEW.dias_semana) THEN
    v_diff := v_diff || jsonb_build_object(
      'dias_semana', jsonb_build_object('old', OLD.dias_semana, 'new', NEW.dias_semana)
    );
  END IF;

  IF (OLD.data_inicio IS DISTINCT FROM NEW.data_inicio) THEN
    v_diff := v_diff || jsonb_build_object(
      'data_inicio', jsonb_build_object('old', OLD.data_inicio, 'new', NEW.data_inicio)
    );
  END IF;

  IF (OLD.data_fim IS DISTINCT FROM NEW.data_fim) THEN
    v_diff := v_diff || jsonb_build_object(
      'data_fim', jsonb_build_object('old', OLD.data_fim, 'new', NEW.data_fim)
    );
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    v_diff := v_diff || jsonb_build_object(
      'status', jsonb_build_object('old', OLD.status, 'new', NEW.status)
    );
  END IF;

  IF (OLD.professor_id IS DISTINCT FROM NEW.professor_id) THEN
    v_diff := v_diff || jsonb_build_object(
      'professor_id', jsonb_build_object('old', OLD.professor_id, 'new', NEW.professor_id)
    );
  END IF;

  IF (OLD.periodo_letivo_id IS DISTINCT FROM NEW.periodo_letivo_id) THEN
    v_diff := v_diff || jsonb_build_object(
      'periodo_letivo_id', jsonb_build_object('old', OLD.periodo_letivo_id, 'new', NEW.periodo_letivo_id)
    );
  END IF;

  IF (OLD.carga_horaria_prevista IS DISTINCT FROM NEW.carga_horaria_prevista) THEN
    v_diff := v_diff || jsonb_build_object(
      'carga_horaria_prevista',
      jsonb_build_object('old', OLD.carga_horaria_prevista, 'new', NEW.carga_horaria_prevista)
    );
  END IF;

  IF (OLD.frequencia_minima_percentual IS DISTINCT FROM NEW.frequencia_minima_percentual) THEN
    v_diff := v_diff || jsonb_build_object(
      'frequencia_minima_percentual',
      jsonb_build_object('old', OLD.frequencia_minima_percentual, 'new', NEW.frequencia_minima_percentual)
    );
  END IF;

  IF (OLD.encerramento_automatico IS DISTINCT FROM NEW.encerramento_automatico) THEN
    v_diff := v_diff || jsonb_build_object(
      'encerramento_automatico',
      jsonb_build_object('old', OLD.encerramento_automatico, 'new', NEW.encerramento_automatico)
    );
  END IF;

  IF (OLD.ativo IS DISTINCT FROM NEW.ativo) THEN
    v_diff := v_diff || jsonb_build_object(
      'ativo', jsonb_build_object('old', OLD.ativo, 'new', NEW.ativo)
    );
  END IF;

  IF (OLD.observacoes IS DISTINCT FROM NEW.observacoes) THEN
    v_diff := v_diff || jsonb_build_object(
      'observacoes', jsonb_build_object('old', OLD.observacoes, 'new', NEW.observacoes)
    );
  END IF;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO public.turmas_historico (turma_id, actor_user_id, evento, resumo, diff, snapshot)
    VALUES (NEW.turma_id, v_actor, 'UPDATE', 'Alteracoes na turma', v_diff, to_jsonb(NEW));
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'turmas'
      AND t.tgname = 'trg_turmas_historico_update'
  ) THEN
    CREATE TRIGGER trg_turmas_historico_update
    AFTER UPDATE ON public.turmas
    FOR EACH ROW
    EXECUTE FUNCTION public.log_turmas_update();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_turmas_horarios_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
  v_turma_id bigint;
  v_evento text;
  v_resumo text;
  v_diff jsonb := '{}'::jsonb;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;

  v_turma_id := COALESCE(NEW.turma_id, OLD.turma_id);
  IF v_turma_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_evento := 'HORARIO_INSERT';
    v_resumo := 'Horario adicionado';
    v_diff := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_evento := 'HORARIO_UPDATE';
    v_resumo := 'Horario atualizado';
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_evento := 'HORARIO_DELETE';
    v_resumo := 'Horario removido';
    v_diff := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.turmas_historico (turma_id, actor_user_id, evento, resumo, diff)
  VALUES (v_turma_id, v_actor, v_evento, v_resumo, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'turmas_horarios'
      AND t.tgname = 'trg_turmas_horarios_historico'
  ) THEN
    CREATE TRIGGER trg_turmas_horarios_historico
    AFTER INSERT OR UPDATE OR DELETE ON public.turmas_horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.log_turmas_horarios_change();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_turma_niveis_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
  v_turma_id bigint;
  v_evento text;
  v_resumo text;
  v_diff jsonb := '{}'::jsonb;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;

  v_turma_id := COALESCE(NEW.turma_id, OLD.turma_id);
  IF v_turma_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_evento := 'NIVEL_INSERT';
    v_resumo := 'Nivel vinculado';
    v_diff := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_evento := 'NIVEL_UPDATE';
    v_resumo := 'Nivel atualizado';
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_evento := 'NIVEL_DELETE';
    v_resumo := 'Nivel removido';
    v_diff := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.turmas_historico (turma_id, actor_user_id, evento, resumo, diff)
  VALUES (v_turma_id, v_actor, v_evento, v_resumo, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'turma_niveis'
      AND t.tgname = 'trg_turma_niveis_historico'
  ) THEN
    CREATE TRIGGER trg_turma_niveis_historico
    AFTER INSERT OR UPDATE OR DELETE ON public.turma_niveis
    FOR EACH ROW
    EXECUTE FUNCTION public.log_turma_niveis_change();
  END IF;
END $$;

-- ------------------------------------------------------
-- RLS basico (ajustar conforme governanca)
-- ------------------------------------------------------
ALTER TABLE public.turmas_historico ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'turmas_historico'
      AND policyname = 'turmas_historico_select_authenticated'
  ) THEN
    CREATE POLICY turmas_historico_select_authenticated
      ON public.turmas_historico
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'turmas_historico'
      AND policyname = 'turmas_historico_insert_denied'
  ) THEN
    CREATE POLICY turmas_historico_insert_denied
      ON public.turmas_historico
      FOR INSERT
      TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

COMMIT;
