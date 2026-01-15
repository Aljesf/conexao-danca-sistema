BEGIN;

-- 1) movimento_concessoes: dia de vencimento do ciclo (padrao 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_concessoes' AND column_name='dia_vencimento_ciclo'
  ) THEN
    ALTER TABLE public.movimento_concessoes
      ADD COLUMN dia_vencimento_ciclo integer NOT NULL DEFAULT 1;

    ALTER TABLE public.movimento_concessoes
      ADD CONSTRAINT ck_mov_concessoes_dia_venc
      CHECK (dia_vencimento_ciclo >= 1 AND dia_vencimento_ciclo <= 28);
  END IF;
END $$;

-- 2) Historico de ciclos/renovacoes (competencia = YYYY-MM-01)
CREATE TABLE IF NOT EXISTS public.movimento_concessoes_ciclos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessao_id    uuid NOT NULL REFERENCES public.movimento_concessoes(id) ON DELETE CASCADE,

  competencia     date NOT NULL,
  dt_vencimento   date NOT NULL,
  dt_renovacao    timestamptz NOT NULL DEFAULT now(),

  observacoes     text NULL,

  criado_em       timestamptz NOT NULL DEFAULT now(),
  criado_por      uuid NULL,

  CONSTRAINT ck_mov_ciclos_competencia_primeiro_dia
    CHECK (EXTRACT(day FROM competencia) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_concessoes_ciclos_concessao_competencia
  ON public.movimento_concessoes_ciclos(concessao_id, competencia);

CREATE INDEX IF NOT EXISTS idx_mov_concessoes_ciclos_concessao
  ON public.movimento_concessoes_ciclos(concessao_id);

CREATE INDEX IF NOT EXISTS idx_mov_concessoes_ciclos_competencia
  ON public.movimento_concessoes_ciclos(competencia);

COMMIT;
