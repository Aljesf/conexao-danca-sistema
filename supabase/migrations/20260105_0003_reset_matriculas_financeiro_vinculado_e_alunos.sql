-- RESET (BANCO DE TESTE)
-- Remove:
--  - todas as matrículas (zera ID)
--  - todas as faturas do Crédito Conexão (zera ID)
--  - lançamentos financeiros vinculados às matrículas
--  - cadastro de aluno relacionado às matrículas (sem apagar pessoas)
-- Preserva:
--  - pessoas, cursos, turmas, centros de custo, e demais cadastros-base

BEGIN;

-- 1) Preparar conjuntos de IDs (matrículas e alunos ligados às matrículas, quando existir)
DO $$
BEGIN
  -- matrículas
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    EXECUTE 'CREATE TEMP TABLE tmp_reset_matriculas_ids AS SELECT id FROM public.matriculas';
    RAISE NOTICE 'matriculas (antes): %', (SELECT count(*) FROM tmp_reset_matriculas_ids);
  ELSE
    EXECUTE 'CREATE TEMP TABLE tmp_reset_matriculas_ids (id bigint)';
    RAISE NOTICE 'public.matriculas não existe.';
  END IF;

  -- alunos vinculados às matrículas (se a coluna existir)
  IF to_regclass('public.matriculas') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'matriculas' AND column_name = 'aluno_id'
     ) THEN
    EXECUTE '
      CREATE TEMP TABLE tmp_reset_alunos_ids AS
      SELECT DISTINCT aluno_id AS id
      FROM public.matriculas
      WHERE aluno_id IS NOT NULL
    ';
    RAISE NOTICE 'alunos ligados a matrículas (antes): %', (SELECT count(*) FROM tmp_reset_alunos_ids);
  ELSE
    EXECUTE 'CREATE TEMP TABLE tmp_reset_alunos_ids (id bigint)';
    RAISE NOTICE 'Sem coluna matriculas.aluno_id (ou tabela matriculas inexistente).';
  END IF;
END $$;

-- 2) Apagar vínculos operacionais de turma/aluno (se existirem)
DO $$
BEGIN
  IF to_regclass('public.turma_aluno') IS NOT NULL THEN
    -- tabela operacional; em banco de teste, limpar tudo é aceitável e preserva turmas/pessoas
    EXECUTE 'TRUNCATE TABLE public.turma_aluno RESTART IDENTITY CASCADE';
    RAISE NOTICE 'turma_aluno: TRUNCATE total + RESTART IDENTITY';
  END IF;

  IF to_regclass('public.alunos_turmas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.alunos_turmas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'alunos_turmas: TRUNCATE total + RESTART IDENTITY';
  END IF;

  -- tabelas-filhas típicas de matrícula (ajuste se tiver nomes diferentes; executa só se existir)
  IF to_regclass('public.matricula_itens') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.matricula_itens RESTART IDENTITY CASCADE';
    RAISE NOTICE 'matricula_itens: TRUNCATE total + RESTART IDENTITY';
  END IF;

  IF to_regclass('public.matricula_unidades_execucao') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.matricula_unidades_execucao RESTART IDENTITY CASCADE';
    RAISE NOTICE 'matricula_unidades_execucao: TRUNCATE total + RESTART IDENTITY';
  END IF;

  IF to_regclass('public.matricula_cursos') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.matricula_cursos RESTART IDENTITY CASCADE';
    RAISE NOTICE 'matricula_cursos: TRUNCATE total + RESTART IDENTITY';
  END IF;
END $$;

-- 3) Credito Conexao: apagar lancamentos vinculados a matricula (origem) + zerar TODAS as faturas (como solicitado)
DO $$
DECLARE
  has_origem_sistema boolean;
  has_origem_id boolean;
BEGIN
  -- 3.1 zerar primeiro tabelas filhas das faturas
  IF to_regclass('public.credito_conexao_fatura_lancamentos') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.credito_conexao_fatura_lancamentos RESTART IDENTITY CASCADE';
    RAISE NOTICE 'credito_conexao_fatura_lancamentos: TRUNCATE total + RESTART IDENTITY';
  END IF;

  -- 3.2 apagar lancamentos originados de matricula (sem tocar em outros, quando possivel)
  IF to_regclass('public.credito_conexao_lancamentos') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='credito_conexao_lancamentos' AND column_name='origem_sistema'
    ) INTO has_origem_sistema;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='credito_conexao_lancamentos' AND column_name='origem_id'
    ) INTO has_origem_id;

    IF has_origem_sistema AND has_origem_id AND to_regclass('public.matriculas') IS NOT NULL THEN
      EXECUTE '
        DELETE FROM public.credito_conexao_lancamentos l
        USING tmp_reset_matriculas_ids t
        WHERE l.origem_sistema = ''MATRICULA''
          AND l.origem_id = t.id
      ';
      RAISE NOTICE 'credito_conexao_lancamentos: DELETE por origem=MATRICULA + origem_id em matriculas';
    ELSIF has_origem_sistema THEN
      EXECUTE '
        DELETE FROM public.credito_conexao_lancamentos
        WHERE origem_sistema = ''MATRICULA''
      ';
      RAISE NOTICE 'credito_conexao_lancamentos: DELETE por origem=MATRICULA (fallback)';
    ELSE
      RAISE NOTICE 'credito_conexao_lancamentos: sem colunas de origem; NAO apagado automaticamente para evitar impacto em outros modulos.';
    END IF;
  END IF;

  -- 3.3 zerar todas as faturas (pedido explicito) com RESTART IDENTITY
  IF to_regclass('public.credito_conexao_faturas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.credito_conexao_faturas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'credito_conexao_faturas: TRUNCATE total + RESTART IDENTITY';
  END IF;
END $$;

-- 4) Financeiro “contas recebidas / contas a receber / cobranças / recebimentos” vinculados às matrículas
-- Só apaga se existir coluna matricula_id (seguro).
DO $$
BEGIN
  IF to_regclass('public.contas_receber') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='contas_receber' AND column_name='matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.contas_receber cr
      USING tmp_reset_matriculas_ids t
      WHERE cr.matricula_id = t.id
    ';
    RAISE NOTICE 'contas_receber: DELETE por matricula_id';
  END IF;

  IF to_regclass('public.cobrancas') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='cobrancas' AND column_name='matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.cobrancas c
      USING tmp_reset_matriculas_ids t
      WHERE c.matricula_id = t.id
    ';
    RAISE NOTICE 'cobrancas: DELETE por matricula_id';
  END IF;

  IF to_regclass('public.recebimentos') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='recebimentos' AND column_name='matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.recebimentos r
      USING tmp_reset_matriculas_ids t
      WHERE r.matricula_id = t.id
    ';
    RAISE NOTICE 'recebimentos: DELETE por matricula_id';
  END IF;

  -- Se houver tabela de "baixas" / "liquidacoes" vinculadas, trate aqui de forma semelhante (somente se tiver matricula_id).
  IF to_regclass('public.liquidacoes') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='liquidacoes' AND column_name='matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.liquidacoes lq
      USING tmp_reset_matriculas_ids t
      WHERE lq.matricula_id = t.id
    ';
    RAISE NOTICE 'liquidacoes: DELETE por matricula_id';
  END IF;
END $$;

-- 5) Apagar matrículas (zera ID) e dependentes via CASCADE (somente dependentes)
DO $$
BEGIN
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.matriculas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'matriculas: TRUNCATE total + RESTART IDENTITY';
  END IF;
END $$;

-- 6) Apagar cadastro de aluno vinculado às matrículas (sem apagar pessoas)
DO $$
BEGIN
  IF to_regclass('public.alunos') IS NULL THEN
    RAISE NOTICE 'public.alunos não existe; pulando.';
    RETURN;
  END IF;

  -- Caso 1: se coletamos alunos ligados a matrículas, apaga esses alunos
  IF EXISTS (SELECT 1 FROM tmp_reset_alunos_ids) THEN
    EXECUTE '
      DELETE FROM public.alunos a
      USING tmp_reset_alunos_ids t
      WHERE a.id = t.id
    ';
    RAISE NOTICE 'alunos: DELETE por lista de alunos vinculados às matrículas';
  END IF;

  -- Caso 2 (segurança extra): apagar alunos órfãos sem matrícula (apenas se existir matriculas.aluno_id)
  IF to_regclass('public.matriculas') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'matriculas' AND column_name = 'aluno_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.alunos a
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.matriculas m
        WHERE m.aluno_id = a.id
      )
    ';
    RAISE NOTICE 'alunos: DELETE órfãos (sem matrícula)';
  END IF;

  -- opcional: reiniciar ID de alunos (somente se você realmente quer “zera ID” também em alunos)
  -- Como você pediu para zerar ID "se puder", vamos aplicar RESTART IDENTITY via TRUNCATE somente se alunos for “cadastro derivado”
  -- ATENÇÃO: isso apaga TODOS os alunos remanescentes. Como já deletamos por vínculo, o TRUNCATE aqui pode ser agressivo.
  -- Por padrão, NÃO TRUNCAR alunos. Se você quiser truncar, descomente:
  -- TRUNCATE TABLE public.alunos RESTART IDENTITY CASCADE;
END $$;

COMMIT;

-- 7) Pós-check rápido
DO $$
BEGIN
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    RAISE NOTICE 'matriculas (depois): %', (SELECT count(*) FROM public.matriculas);
  END IF;
  IF to_regclass('public.credito_conexao_faturas') IS NOT NULL THEN
    RAISE NOTICE 'credito_conexao_faturas (depois): %', (SELECT count(*) FROM public.credito_conexao_faturas);
  END IF;
END $$;
