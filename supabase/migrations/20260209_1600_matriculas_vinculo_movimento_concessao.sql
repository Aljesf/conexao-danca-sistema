-- Objetivo:
-- 1) Criar vinculo explicito da matricula com a concessao do Movimento (pagador institucional).
-- 2) Evitar quebra por inconsistencia de CHECK no campo metodo_liquidacao.

BEGIN;

-- 2.1) Adicionar coluna de vinculo com concessao do Movimento
-- Observacao: movimento_concessoes.id e uuid no schema atual.
ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS movimento_concessao_id uuid NULL;

-- 2.2) FK (ON DELETE SET NULL para preservar historico)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_movimento_concessao_id_fkey'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_movimento_concessao_id_fkey
      FOREIGN KEY (movimento_concessao_id)
      REFERENCES public.movimento_concessoes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2.3) Indice para consultas/auditoria
CREATE INDEX IF NOT EXISTS idx_matriculas_movimento_concessao_id
  ON public.matriculas (movimento_concessao_id);

-- 2.4) Ajuste do metodo_liquidacao (alinha DB com uso de codigo)
-- 2.4.1) Remove constraints conhecidas
ALTER TABLE public.matriculas
  DROP CONSTRAINT IF EXISTS matriculas_metodo_liquidacao_check;

ALTER TABLE public.matriculas
  DROP CONSTRAINT IF EXISTS matriculas_metodo_liquidacao_chk;

-- 2.4.2) Remove qualquer CHECK residual que cite metodo_liquidacao
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.matriculas'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%metodo_liquidacao%'
  LOOP
    EXECUTE format('ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 2.4.3) Cria constraint canonica
ALTER TABLE public.matriculas
  ADD CONSTRAINT matriculas_metodo_liquidacao_check
  CHECK (
    metodo_liquidacao IN (
      'CARTAO_CONEXAO',
      'CREDITO_BOLSA',
      'COBRANCAS_LEGADO',
      'OUTRO'
    )
  );

COMMIT;
