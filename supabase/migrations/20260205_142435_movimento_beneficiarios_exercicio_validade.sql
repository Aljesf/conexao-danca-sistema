BEGIN;

-- Exercicio (ano) + validade (data) para cadastro institucional do Movimento Conexao Banco
-- Regra: beneficiario e manual. Exercicio serve para relatorios; validade para expiracao automatica.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='exercicio_ano'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios
      ADD COLUMN exercicio_ano integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movimento_beneficiarios' AND column_name='valido_ate'
  ) THEN
    ALTER TABLE public.movimento_beneficiarios
      ADD COLUMN valido_ate date;
  END IF;
END $$;

-- Defaults suaves (nao quebra historico)
-- exercicio_ano: ano atual, quando NULL
-- valido_ate: 31/12 do ano do exercicio, quando NULL e exercicio_ano nao nulo
UPDATE public.movimento_beneficiarios
SET exercicio_ano = EXTRACT(YEAR FROM NOW())::int
WHERE exercicio_ano IS NULL;

UPDATE public.movimento_beneficiarios
SET valido_ate = make_date(exercicio_ano, 12, 31)
WHERE valido_ate IS NULL AND exercicio_ano IS NOT NULL;

COMMIT;
