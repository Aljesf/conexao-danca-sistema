-- 20260112_000101_calendario_constraints_v1.sql
-- Objetivo: consolidar estrutura do calendario (PK/FK/IDs/uniques/indices) e adicionar campos minimos.
-- Migracao defensiva: nao quebra se algo ja existir.

BEGIN;

-- =========================================================
-- 2) Colunas adicionais minimas (sem refatorar tipos)
-- =========================================================

-- eventos_internos: permitir marcar evento em avaliacao sem inventar data/horario definitivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='eventos_internos' AND column_name='em_avaliacao'
  ) THEN
    ALTER TABLE public.eventos_internos
      ADD COLUMN em_avaliacao boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='eventos_internos' AND column_name='data_prevista'
  ) THEN
    ALTER TABLE public.eventos_internos
      ADD COLUMN data_prevista date;
  END IF;
END $$;

-- calendario_itens_institucionais: data_fim_eff para unicidade sem funcao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calendario_itens_institucionais' AND column_name='data_fim_eff'
  ) THEN
    ALTER TABLE public.calendario_itens_institucionais
      ADD COLUMN data_fim_eff date;

    UPDATE public.calendario_itens_institucionais
    SET data_fim_eff = COALESCE(data_fim, data_inicio)
    WHERE data_fim_eff IS NULL;

    ALTER TABLE public.calendario_itens_institucionais
      ALTER COLUMN data_fim_eff SET NOT NULL;

    ALTER TABLE public.calendario_itens_institucionais
      ALTER COLUMN data_fim_eff SET DEFAULT CURRENT_DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'calendario_itens_institucionais_set_data_fim_eff'
  ) THEN
    CREATE OR REPLACE FUNCTION public.calendario_itens_institucionais_set_data_fim_eff()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.data_fim_eff := COALESCE(NEW.data_fim, NEW.data_inicio);
      RETURN NEW;
    END;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_cal_itens_set_data_fim_eff'
      AND tgrelid = 'public.calendario_itens_institucionais'::regclass
  ) THEN
    CREATE TRIGGER trg_cal_itens_set_data_fim_eff
    BEFORE INSERT OR UPDATE OF data_inicio, data_fim
    ON public.calendario_itens_institucionais
    FOR EACH ROW
    EXECUTE FUNCTION public.calendario_itens_institucionais_set_data_fim_eff();
  END IF;
END $$;

-- calendario_itens_institucionais: padronizar escopo (mantem text, mas valida valores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calendario_itens_institucionais' AND column_name='escopo'
  ) THEN
    ALTER TABLE public.calendario_itens_institucionais
      ADD COLUMN escopo text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendario_itens_institucionais_escopo_chk'
      AND conrelid = 'public.calendario_itens_institucionais'::regclass
  ) THEN
    ALTER TABLE public.calendario_itens_institucionais
      ADD CONSTRAINT calendario_itens_institucionais_escopo_chk
      CHECK (
        escopo IS NULL OR escopo IN ('NACIONAL','ESTADUAL','MUNICIPAL','INSTITUCIONAL','INTERNO','EXTERNO')
      );
  END IF;
END $$;

-- =========================================================
-- 3) PKs (se faltarem)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='p' AND conrelid='public.periodos_letivos'::regclass) THEN
    ALTER TABLE public.periodos_letivos ADD CONSTRAINT periodos_letivos_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='p' AND conrelid='public.periodos_letivos_faixas'::regclass) THEN
    ALTER TABLE public.periodos_letivos_faixas ADD CONSTRAINT periodos_letivos_faixas_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='p' AND conrelid='public.calendario_itens_institucionais'::regclass) THEN
    ALTER TABLE public.calendario_itens_institucionais ADD CONSTRAINT calendario_itens_institucionais_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='p' AND conrelid='public.eventos_internos'::regclass) THEN
    ALTER TABLE public.eventos_internos ADD CONSTRAINT eventos_internos_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- =========================================================
-- 4) Unique para UPSERT confiavel
-- =========================================================

-- periodos_letivos: codigo deve ser unico (permite ON CONFLICT (codigo))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='periodos_letivos_codigo_uk'
      AND conrelid='public.periodos_letivos'::regclass
  ) THEN
    ALTER TABLE public.periodos_letivos
      ADD CONSTRAINT periodos_letivos_codigo_uk UNIQUE (codigo);
  END IF;
END $$;

-- Faixas: chave natural pelo periodo + intervalo + categoria + titulo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='periodos_letivos_faixas_uk'
      AND conrelid='public.periodos_letivos_faixas'::regclass
  ) THEN
    ALTER TABLE public.periodos_letivos_faixas
      ADD CONSTRAINT periodos_letivos_faixas_uk
      UNIQUE (periodo_letivo_id, dominio, categoria, titulo, data_inicio, data_fim);
  END IF;
END $$;

-- Itens institucionais: unicidade logica sem funcao (data_fim_eff)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='calendario_itens_institucionais_uk'
      AND conrelid='public.calendario_itens_institucionais'::regclass
  ) THEN
    ALTER TABLE public.calendario_itens_institucionais
      ADD CONSTRAINT calendario_itens_institucionais_uk
      UNIQUE (periodo_letivo_id, dominio, categoria, titulo, data_inicio, data_fim_eff);
  END IF;
END $$;

-- Eventos internos: chave natural pelo periodo + titulo + inicio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='eventos_internos_uk'
      AND conrelid='public.eventos_internos'::regclass
  ) THEN
    ALTER TABLE public.eventos_internos
      ADD CONSTRAINT eventos_internos_uk
      UNIQUE (periodo_letivo_id, titulo, inicio);
  END IF;
END $$;

-- =========================================================
-- 5) FKs de periodo_letivo_id (se faltarem)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='periodos_letivos_faixas_periodo_letivo_id_fkey'
      AND conrelid='public.periodos_letivos_faixas'::regclass
  ) THEN
    ALTER TABLE public.periodos_letivos_faixas
      ADD CONSTRAINT periodos_letivos_faixas_periodo_letivo_id_fkey
      FOREIGN KEY (periodo_letivo_id) REFERENCES public.periodos_letivos(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='calendario_itens_institucionais_periodo_letivo_id_fkey'
      AND conrelid='public.calendario_itens_institucionais'::regclass
  ) THEN
    ALTER TABLE public.calendario_itens_institucionais
      ADD CONSTRAINT calendario_itens_institucionais_periodo_letivo_id_fkey
      FOREIGN KEY (periodo_letivo_id) REFERENCES public.periodos_letivos(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='eventos_internos_periodo_letivo_id_fkey'
      AND conrelid='public.eventos_internos'::regclass
  ) THEN
    ALTER TABLE public.eventos_internos
      ADD CONSTRAINT eventos_internos_periodo_letivo_id_fkey
      FOREIGN KEY (periodo_letivo_id) REFERENCES public.periodos_letivos(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- =========================================================
-- 6) Indices (performance)
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_periodos_letivos_ano_ref
  ON public.periodos_letivos (ano_referencia);

CREATE INDEX IF NOT EXISTS idx_faixas_periodo_datas
  ON public.periodos_letivos_faixas (periodo_letivo_id, data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_itens_periodo_datas
  ON public.calendario_itens_institucionais (periodo_letivo_id, data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_eventos_periodo_timestamps
  ON public.eventos_internos (periodo_letivo_id, inicio, fim);

COMMIT;
