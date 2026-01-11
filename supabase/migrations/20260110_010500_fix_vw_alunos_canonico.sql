DO $$
DECLARE
  has_pessoas_roles BOOLEAN;
  has_matriculas BOOLEAN;
  has_turma_aluno BOOLEAN;

  col_matriculas_pessoa TEXT;
  col_turma_aluno_pessoa TEXT;

  sql TEXT := 'CREATE OR REPLACE VIEW public.vw_alunos_canonico AS ';
  parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  has_pessoas_roles := to_regclass('public.pessoas_roles') IS NOT NULL;
  has_matriculas := to_regclass('public.matriculas') IS NOT NULL;
  has_turma_aluno := to_regclass('public.turma_aluno') IS NOT NULL;

  -- Fonte A: role ALUNO (quando existir)
  IF has_pessoas_roles THEN
    parts := array_append(
      parts,
      $$SELECT DISTINCT
          p.id AS pessoa_id,
          p.nome,
          p.email,
          p.telefone,
          p.ativo
        FROM public.pessoas p
        JOIN public.pessoas_roles pr
          ON pr.pessoa_id = p.id
         AND pr.role = 'ALUNO'
        WHERE p.ativo = true$$
    );
  END IF;

  -- Fonte B: matricula (qualquer pessoa matriculada vira aluno canonico)
  IF has_matriculas THEN
    SELECT c.column_name
    INTO col_matriculas_pessoa
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'matriculas'
      AND c.column_name IN ('pessoa_id', 'aluno_pessoa_id', 'aluno_id')
    ORDER BY CASE c.column_name
      WHEN 'pessoa_id' THEN 1
      WHEN 'aluno_pessoa_id' THEN 2
      WHEN 'aluno_id' THEN 3
      ELSE 99
    END
    LIMIT 1;

    IF col_matriculas_pessoa IS NOT NULL THEN
      parts := array_append(
        parts,
        format(
          $$SELECT DISTINCT
              p.id AS pessoa_id,
              p.nome,
              p.email,
              p.telefone,
              p.ativo
            FROM public.matriculas m
            JOIN public.pessoas p
              ON p.id = m.%I
            WHERE p.ativo = true$$,
          col_matriculas_pessoa
        )
      );
    END IF;
  END IF;

  -- Fonte C: turma_aluno (vinculo operacional)
  IF has_turma_aluno THEN
    SELECT c.column_name
    INTO col_turma_aluno_pessoa
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'turma_aluno'
      AND c.column_name IN ('aluno_pessoa_id', 'pessoa_id', 'aluno_id')
    ORDER BY CASE c.column_name
      WHEN 'aluno_pessoa_id' THEN 1
      WHEN 'pessoa_id' THEN 2
      WHEN 'aluno_id' THEN 3
      ELSE 99
    END
    LIMIT 1;

    IF col_turma_aluno_pessoa IS NOT NULL THEN
      parts := array_append(
        parts,
        format(
          $$SELECT DISTINCT
              p.id AS pessoa_id,
              p.nome,
              p.email,
              p.telefone,
              p.ativo
            FROM public.turma_aluno ta
            JOIN public.pessoas p
              ON p.id = ta.%I
            WHERE p.ativo = true$$,
          col_turma_aluno_pessoa
        )
      );
    END IF;
  END IF;

  IF array_length(parts, 1) IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel construir vw_alunos_canonico: nenhuma fonte encontrada (pessoas_roles/matriculas/turma_aluno).';
  END IF;

  sql := sql || array_to_string(parts, E'\nUNION\n');

  EXECUTE sql;

  EXECUTE $comment$
  COMMENT ON VIEW public.vw_alunos_canonico IS
  'View canonica de alunos: uniao de fontes (matriculas/turma_aluno/role ALUNO) com fallback seguro.';
  $comment$;
END $$;
