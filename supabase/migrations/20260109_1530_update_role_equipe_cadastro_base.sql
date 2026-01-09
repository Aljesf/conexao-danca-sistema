DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id
  FROM public.roles_sistema
  WHERE codigo = 'EQUIPE_CADASTRO_BASE'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role EQUIPE_CADASTRO_BASE nao encontrado em public.roles_sistema.';
  END IF;

  UPDATE public.roles_sistema
  SET
    nome = 'Equipe - Cadastro Base (Temporario)',
    descricao = 'Permite cadastrar/editar cadastros-base (pessoas/alunos/cursos/modulos/conteudos/plano de aula/turmas/horarios). Bloqueia matricula/financeiro/credito e bloqueia contextos Administracao/Loja/Cafe.',
    permissoes = jsonb_build_object(
      'tipo', 'TEMPORARIO_SETUP',
      'expira_quando', 'REMOVER_APOS_SETUP',
      'allow', jsonb_build_object(
        'pages_prefix', jsonb_build_array(
          '/pessoas',
          '/turmas',
          '/academico'
        ),
        'api_prefix', jsonb_build_array(
          '/api/pessoas',
          '/api/alunos',
          '/api/turmas',
          '/api/academico'
        )
      ),
      'deny', jsonb_build_object(
        'pages_prefix', jsonb_build_array(
          '/administracao',
          '/admin',
          '/loja',
          '/cafe',
          '/financeiro',
          '/matriculas',
          '/credito-conexao'
        ),
        'api_prefix', jsonb_build_array(
          '/api/admin',
          '/api/administracao',
          '/api/loja',
          '/api/cafe',
          '/api/financeiro',
          '/api/matriculas',
          '/api/credito-conexao'
        )
      )
    ),
    ativo = true
  WHERE id = v_role_id;
END $$;
