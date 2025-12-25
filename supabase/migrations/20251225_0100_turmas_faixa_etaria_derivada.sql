BEGIN;

-- 1) Colunas derivadas na turma
ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS idade_minima integer;

ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS idade_maxima integer;

CREATE INDEX IF NOT EXISTS idx_turmas_idade_minima ON public.turmas (idade_minima);
CREATE INDEX IF NOT EXISTS idx_turmas_idade_maxima ON public.turmas (idade_maxima);

-- 2) Funcao: recalcula faixa etaria da turma com base em turma_niveis -> niveis
CREATE OR REPLACE FUNCTION public.recalc_turma_faixa_etaria(p_turma_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_min integer;
  v_max integer;
BEGIN
  SELECT
    MIN(n.idade_minima),
    MAX(n.idade_maxima)
  INTO v_min, v_max
  FROM public.turma_niveis tn
  JOIN public.niveis n ON n.id = tn.nivel_id
  WHERE tn.turma_id = p_turma_id;

  UPDATE public.turmas
  SET idade_minima = v_min,
      idade_maxima = v_max
  WHERE turma_id = p_turma_id;
END;
$$;

-- 3) Trigger helper: executa recalc baseado no NEW/OLD
CREATE OR REPLACE FUNCTION public.trg_recalc_turma_faixa_etaria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_turma_id bigint;
BEGIN
  v_turma_id := COALESCE(NEW.turma_id, OLD.turma_id);
  PERFORM public.recalc_turma_faixa_etaria(v_turma_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Trigger em turma_niveis (quando inserir/atualizar/deletar vinculos)
DROP TRIGGER IF EXISTS turma_niveis_recalc_faixa_etaria_ins ON public.turma_niveis;
CREATE TRIGGER turma_niveis_recalc_faixa_etaria_ins
AFTER INSERT ON public.turma_niveis
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_turma_faixa_etaria();

DROP TRIGGER IF EXISTS turma_niveis_recalc_faixa_etaria_upd ON public.turma_niveis;
CREATE TRIGGER turma_niveis_recalc_faixa_etaria_upd
AFTER UPDATE ON public.turma_niveis
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_turma_faixa_etaria();

DROP TRIGGER IF EXISTS turma_niveis_recalc_faixa_etaria_del ON public.turma_niveis;
CREATE TRIGGER turma_niveis_recalc_faixa_etaria_del
AFTER DELETE ON public.turma_niveis
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_turma_faixa_etaria();

-- 5) Backfill: recalcular para turmas que ja tem vinculos
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (SELECT DISTINCT turma_id FROM public.turma_niveis) LOOP
    PERFORM public.recalc_turma_faixa_etaria(r.turma_id);
  END LOOP;
END;
$$;

COMMIT;
