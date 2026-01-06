-- RESET DEV: Matriculas + vinculos + financeiro vinculado
-- Uso: SQL Editor do Supabase (banco de teste) ou via psql.
-- Preserva: pessoas, cursos, turmas, centros de custo.
-- Remove: matriculas e tudo vinculado a elas (inclui credito/faturas e financeiro com matricula_id).

BEGIN;

-- 1) Preparar IDs de matriculas e alunos ligados (quando existir)
DO $$
BEGIN
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    EXECUTE 'CREATE TEMP TABLE tmp_reset_matriculas_ids AS SELECT id FROM public.matriculas';
    RAISE NOTICE 'matriculas (antes): %', (SELECT count(*) FROM tmp_reset_matriculas_ids);
  ELSE
    EXECUTE 'CREATE TEMP TABLE tmp_reset_matriculas_ids (id bigint)';
    RAISE NOTICE 'public.matriculas nao existe.';
  END IF;

  IF to_regclass('public.matriculas') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'matriculas'
         AND column_name = 'aluno_id'
     ) THEN
    EXECUTE '
      CREATE TEMP TABLE tmp_reset_alunos_ids AS
      SELECT DISTINCT aluno_id AS id
      FROM public.matriculas
      WHERE aluno_id IS NOT NULL
    ';
    RAISE NOTICE 'alunos ligados a matriculas (antes): %', (SELECT count(*) FROM tmp_reset_alunos_ids);
  ELSE
    EXECUTE 'CREATE TEMP TABLE tmp_reset_alunos_ids (id bigint)';
    RAISE NOTICE 'Sem coluna matriculas.aluno_id (ou tabela matriculas inexistente).';
  END IF;
END $$;

-- 2) Limpar vinculos operacionais (tabelas puramente operacionais podem ser truncadas)
DO $$
BEGIN
  IF to_regclass('public.turma_aluno') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.turma_aluno RESTART IDENTITY CASCADE';
    RAISE NOTICE 'turma_aluno: TRUNCATE total + RESTART IDENTITY';
  END IF;

  IF to_regclass('public.alunos_turmas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.alunos_turmas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'alunos_turmas: TRUNCATE total + RESTART IDENTITY';
  END IF;

  -- tabelas-filhas de matricula (se existirem; ajuste nomes conforme seu schema)
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

-- 3) CREDITO CONEXAO - ORDEM CORRETA PARA NAO QUEBRAR FK
DO $$
DECLARE
  has_origem_sistema boolean;
  has_origem_id boolean;
BEGIN
  -- 3.1 Primeiro: FILHA (pivo)
  IF to_regclass('public.credito_conexao_fatura_lancamentos') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.credito_conexao_fatura_lancamentos RESTART IDENTITY CASCADE';
    RAISE NOTICE 'credito_conexao_fatura_lancamentos: TRUNCATE total + RESTART IDENTITY';
  END IF;

  -- 3.2 Depois: lancamentos originados de matricula
  IF to_regclass('public.credito_conexao_lancamentos') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'credito_conexao_lancamentos'
        AND column_name = 'origem_sistema'
    ) INTO has_origem_sistema;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'credito_conexao_lancamentos'
        AND column_name = 'origem_id'
    ) INTO has_origem_id;

    IF has_origem_sistema AND has_origem_id AND to_regclass('public.matriculas') IS NOT NULL THEN
      EXECUTE '
        DELETE FROM public.credito_conexao_lancamentos l
        USING tmp_reset_matriculas_ids t
        WHERE l.origem_sistema = ''MATRICULA''
          AND l.origem_id = t.id
      ';
      RAISE NOTICE 'credito_conexao_lancamentos: DELETE por origem=MATRICULA + origem_id';
    ELSIF has_origem_sistema THEN
      EXECUTE '
        DELETE FROM public.credito_conexao_lancamentos
        WHERE origem_sistema = ''MATRICULA''
      ';
      RAISE NOTICE 'credito_conexao_lancamentos: DELETE por origem=MATRICULA (fallback)';
    ELSE
      RAISE NOTICE 'credito_conexao_lancamentos: sem colunas de origem; NAO apagado automaticamente.';
    END IF;
  END IF;

  -- 3.3 Por fim: FATURAS (pedido: zerar tudo)
  IF to_regclass('public.credito_conexao_faturas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.credito_conexao_faturas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'credito_conexao_faturas: TRUNCATE total + RESTART IDENTITY';
  END IF;
END $$;

-- 4) Financeiro vinculado por matricula_id (seguro: so apaga se existir a coluna)
DO $$
BEGIN
  IF to_regclass('public.contas_receber') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'contas_receber'
         AND column_name = 'matricula_id'
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
       WHERE table_schema = 'public'
         AND table_name  = 'cobrancas'
         AND column_name = 'matricula_id'
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
       WHERE table_schema = 'public'
         AND table_name  = 'recebimentos'
         AND column_name = 'matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.recebimentos r
      USING tmp_reset_matriculas_ids t
      WHERE r.matricula_id = t.id
    ';
    RAISE NOTICE 'recebimentos: DELETE por matricula_id';
  END IF;

  IF to_regclass('public.liquidacoes') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'liquidacoes'
         AND column_name = 'matricula_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.liquidacoes lq
      USING tmp_reset_matriculas_ids t
      WHERE lq.matricula_id = t.id
    ';
    RAISE NOTICE 'liquidacoes: DELETE por matricula_id';
  END IF;
END $$;

-- 5) Matriculas (zera ID)
DO $$
BEGIN
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.matriculas RESTART IDENTITY CASCADE';
    RAISE NOTICE 'matriculas: TRUNCATE total + RESTART IDENTITY';
  END IF;
END $$;

-- 6) Alunos ligados a matricula (sem apagar pessoas)
DO $$
BEGIN
  IF to_regclass('public.alunos') IS NULL THEN
    RAISE NOTICE 'public.alunos nao existe; pulando.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM tmp_reset_alunos_ids) THEN
    EXECUTE '
      DELETE FROM public.alunos a
      USING tmp_reset_alunos_ids t
      WHERE a.id = t.id
    ';
    RAISE NOTICE 'alunos: DELETE por lista (vinculados as matriculas)';
  END IF;

  -- remover orfaos, apenas se matriculas.aluno_id existir
  IF to_regclass('public.matriculas') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name  = 'matriculas'
         AND column_name = 'aluno_id'
     ) THEN
    EXECUTE '
      DELETE FROM public.alunos a
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.matriculas m
        WHERE m.aluno_id = a.id
      )
    ';
    RAISE NOTICE 'alunos: DELETE orfaos (sem matricula)';
  END IF;
END $$;

COMMIT;

-- Pos-check (opcional)
DO $$
BEGIN
  IF to_regclass('public.matriculas') IS NOT NULL THEN
    RAISE NOTICE 'matriculas (depois): %', (SELECT count(*) FROM public.matriculas);
  END IF;
  IF to_regclass('public.credito_conexao_faturas') IS NOT NULL THEN
    RAISE NOTICE 'credito_conexao_faturas (depois): %', (SELECT count(*) FROM public.credito_conexao_faturas);
  END IF;
END $$;
