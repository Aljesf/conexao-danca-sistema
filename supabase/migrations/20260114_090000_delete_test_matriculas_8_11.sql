-- ATENCAO:
-- Este script apaga dados de forma irreversivel.
-- Escopo: remover matriculas IDs (8,9,10,11) e tudo que estiver vinculado a elas
-- (turma_aluno, cobrancas/recebimentos, credito_conexao_lancamentos/faturas vazias, etc.).
-- NAO apaga pessoas.

BEGIN;

-- 0) Lista-alvo
CREATE TEMP TABLE tmp_matriculas_delete (id bigint PRIMARY KEY) ON COMMIT DROP;
INSERT INTO tmp_matriculas_delete (id) VALUES (8), (9), (10), (11);

-- 1) Conferencia (antes de apagar)
-- (Voce pode rodar e olhar o resultado no SQL Editor; nao interrompe o script.)
SELECT 'MATRICULAS_ALVO' AS _tag, m.*
FROM public.matriculas m
JOIN tmp_matriculas_delete t ON t.id = m.id
ORDER BY m.id;

-- 2) Coletar IDs financeiros diretos guardados na matricula (se existirem)
CREATE TEMP TABLE tmp_cobrancas_delete (id bigint PRIMARY KEY) ON COMMIT DROP;
CREATE TEMP TABLE tmp_recebimentos_delete (id bigint PRIMARY KEY) ON COMMIT DROP;
CREATE TEMP TABLE tmp_credito_lanc_delete (id bigint PRIMARY KEY) ON COMMIT DROP;
CREATE TEMP TABLE tmp_credito_faturas_candidatas (id bigint PRIMARY KEY) ON COMMIT DROP;

DO $$
BEGIN
-- 2.1) Cobranca/Recebimento diretos na matricula (primeira cobranca)
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='matriculas' AND column_name='primeira_cobranca_cobranca_id'
) THEN
  EXECUTE $q$
    INSERT INTO tmp_cobrancas_delete(id)
    SELECT DISTINCT m.primeira_cobranca_cobranca_id
    FROM public.matriculas m
    JOIN tmp_matriculas_delete t ON t.id = m.id
    WHERE m.primeira_cobranca_cobranca_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  $q$;
END IF;

IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='matriculas' AND column_name='primeira_cobranca_recebimento_id'
) THEN
  EXECUTE $q$
    INSERT INTO tmp_recebimentos_delete(id)
    SELECT DISTINCT m.primeira_cobranca_recebimento_id
    FROM public.matriculas m
    JOIN tmp_matriculas_delete t ON t.id = m.id
    WHERE m.primeira_cobranca_recebimento_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  $q$;
END IF;

-- 2.2) Lancamentos do Cartao Conexao originados por matricula
IF to_regclass('public.credito_conexao_lancamentos') IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credito_conexao_lancamentos' AND column_name='origem_sistema'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credito_conexao_lancamentos' AND column_name='origem_id'
  ) THEN
    EXECUTE $q$
      INSERT INTO tmp_credito_lanc_delete(id)
      SELECT DISTINCT l.id
      FROM public.credito_conexao_lancamentos l
      JOIN tmp_matriculas_delete t ON t.id = l.origem_id
      WHERE l.origem_sistema = 'MATRICULA'
      ON CONFLICT DO NOTHING;
    $q$;
  END IF;
END IF;

-- 2.3) Se o lancamento do cartao tiver cobranca_id, adiciona as cobrancas a deletar
IF to_regclass('public.credito_conexao_lancamentos') IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credito_conexao_lancamentos' AND column_name='cobranca_id'
  ) THEN
    EXECUTE $q$
      INSERT INTO tmp_cobrancas_delete(id)
      SELECT DISTINCT l.cobranca_id
      FROM public.credito_conexao_lancamentos l
      WHERE l.cobranca_id IS NOT NULL
        AND l.id IN (SELECT id FROM tmp_credito_lanc_delete)
      ON CONFLICT DO NOTHING;
    $q$;
  END IF;
END IF;

-- 2.4) Se existir tabela recebimentos com cobranca_id, coletar recebimentos ligados as cobrancas
IF to_regclass('public.recebimentos') IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recebimentos' AND column_name='cobranca_id'
  ) THEN
    EXECUTE $q$
      INSERT INTO tmp_recebimentos_delete(id)
      SELECT DISTINCT r.id
      FROM public.recebimentos r
      WHERE r.cobranca_id IN (SELECT id FROM tmp_cobrancas_delete)
      ON CONFLICT DO NOTHING;
    $q$;
  END IF;
END IF;
END $$;

-- 3) Remover vinculos operacionais de turma
-- 3.1) turma_aluno (tem matricula_id no schema)
DELETE FROM public.turma_aluno ta
WHERE ta.matricula_id IN (SELECT id FROM tmp_matriculas_delete);

-- 3.2) Outras tabelas do dominio Matriculas que podem existir (guardas)
DO $$
BEGIN
-- matriculas_compromissos_previstos (aparece no schema)
IF to_regclass('public.matriculas_compromissos_previstos') IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriculas_compromissos_previstos' AND column_name='matricula_id'
  ) THEN
    EXECUTE $q$
      DELETE FROM public.matriculas_compromissos_previstos
      WHERE matricula_id IN (SELECT id FROM tmp_matriculas_delete);
    $q$;
  END IF;
END IF;

-- Se houver outras tabelas com FK matricula_id, repetir o padrao aqui.
END $$;

-- 4) Cartao Conexao: desvincular e deletar lancamentos e (opcionalmente) faturas vazias
DO $$
BEGIN
-- 4.1) apagar vinculos fatura_lancamentos primeiro
IF to_regclass('public.credito_conexao_fatura_lancamentos') IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credito_conexao_fatura_lancamentos' AND column_name='lancamento_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='credito_conexao_fatura_lancamentos' AND column_name='fatura_id'
  ) THEN
    -- guardar possiveis faturas que ficarao vazias depois
    EXECUTE $q$
      INSERT INTO tmp_credito_faturas_candidatas(id)
      SELECT DISTINCT fl.fatura_id
      FROM public.credito_conexao_fatura_lancamentos fl
      WHERE fl.lancamento_id IN (SELECT id FROM tmp_credito_lanc_delete)
      ON CONFLICT DO NOTHING;
    $q$;

    EXECUTE $q$
      DELETE FROM public.credito_conexao_fatura_lancamentos
      WHERE lancamento_id IN (SELECT id FROM tmp_credito_lanc_delete);
    $q$;
  END IF;
END IF;

-- 4.2) apagar lancamentos do cartao
IF to_regclass('public.credito_conexao_lancamentos') IS NOT NULL THEN
  EXECUTE $q$
    DELETE FROM public.credito_conexao_lancamentos
    WHERE id IN (SELECT id FROM tmp_credito_lanc_delete);
  $q$;
END IF;

-- 4.3) apagar faturas SOMENTE se ficaram sem itens
IF to_regclass('public.credito_conexao_faturas') IS NOT NULL
AND to_regclass('public.credito_conexao_fatura_lancamentos') IS NOT NULL THEN
  EXECUTE $q$
    DELETE FROM public.credito_conexao_faturas f
    WHERE f.id IN (SELECT id FROM tmp_credito_faturas_candidatas)
      AND NOT EXISTS (
        SELECT 1
        FROM public.credito_conexao_fatura_lancamentos fl
        WHERE fl.fatura_id = f.id
      );
  $q$;
END IF;
END $$;

-- 5) Financeiro: apagar recebimentos e cobrancas detectadas
DO $$
BEGIN
IF to_regclass('public.recebimentos') IS NOT NULL THEN
  EXECUTE $q$
    DELETE FROM public.recebimentos
    WHERE id IN (SELECT id FROM tmp_recebimentos_delete);
  $q$;
END IF;

IF to_regclass('public.cobrancas') IS NOT NULL THEN
  EXECUTE $q$
    DELETE FROM public.cobrancas
    WHERE id IN (SELECT id FROM tmp_cobrancas_delete);
  $q$;
END IF;
END $$;

-- 6) Auditoria / logs (se existirem e se tiverem referencia)
DO $$
BEGIN
IF to_regclass('public.auditoria_logs') IS NOT NULL THEN
  -- tenta apagar por referencia_id se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auditoria_logs' AND column_name='referencia_id'
  ) THEN
    EXECUTE $q$
      DELETE FROM public.auditoria_logs
      WHERE referencia_id IN (SELECT id FROM tmp_matriculas_delete);
    $q$;
  END IF;

  -- tenta apagar por origem_id se existir (fallback)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auditoria_logs' AND column_name='origem_id'
  ) THEN
    EXECUTE $q$
      DELETE FROM public.auditoria_logs
      WHERE origem_id IN (SELECT id FROM tmp_matriculas_delete);
    $q$;
  END IF;
END IF;
END $$;

-- 7) Apagar a matricula (por ultimo)
DELETE FROM public.matriculas
WHERE id IN (SELECT id FROM tmp_matriculas_delete);

-- 8) Conferencia (depois de apagar)
SELECT 'MATRICULAS_RESTANTES' AS _tag, m.*
FROM public.matriculas m
WHERE m.id IN (8,9,10,11);

COMMIT;
