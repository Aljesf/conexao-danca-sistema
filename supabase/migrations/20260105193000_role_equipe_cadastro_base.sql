BEGIN;

-- Role para equipe popular cadastros-base, sem operar matricula/financeiro/credito.
INSERT INTO public.roles_sistema (codigo, nome, descricao, editavel, permissoes, ativo)
SELECT
  'EQUIPE_CADASTRO_BASE',
  'Equipe - Cadastro Base',
  'Permite cadastrar/editar cadastros-base (pessoas/turmas/horarios). Bloqueia matricula/financeiro/credito.',
  false,
  jsonb_build_object(
    -- Cadastros-base
    'pessoas', jsonb_build_object('read', true, 'write', true),
    'alunos', jsonb_build_object('read', true, 'write', true),
    'turmas', jsonb_build_object('read', true, 'write', true),
    'turmas_horarios', jsonb_build_object('read', true, 'write', true),
    'cursos', jsonb_build_object('read', true, 'write', false),
    'centros_custo', jsonb_build_object('read', true, 'write', true),

    -- Explicitamente bloqueados
    'matriculas', jsonb_build_object('read', true, 'write', false),
    'financeiro', jsonb_build_object('read', true, 'write', false),
    'credito_conexao', jsonb_build_object('read', true, 'write', false),

    -- Administracao do sistema (bloqueado)
    'admin', jsonb_build_object('read', false, 'write', false)
  ),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles_sistema WHERE codigo = 'EQUIPE_CADASTRO_BASE'
);

-- Funcao opcional: atribuir role a um user_id (caso voce use scripts/admin depois)
CREATE OR REPLACE FUNCTION public.assign_role_to_user(p_user_id uuid, p_role_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id
  FROM public.roles_sistema
  WHERE codigo = p_role_codigo AND ativo = true;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role nao encontrada/ativa: %', p_role_codigo;
  END IF;

  INSERT INTO public.usuario_roles (user_id, role_id)
  SELECT p_user_id, v_role_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.usuario_roles ur
    WHERE ur.user_id = p_user_id AND ur.role_id = v_role_id
  );
END;
$$;

-- Funcao opcional: atribuir role por e-mail (quando o Auth do usuario ja existe)
CREATE OR REPLACE FUNCTION public.assign_role_to_email(p_email text, p_role_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario Auth nao encontrado para email: %', p_email;
  END IF;

  PERFORM public.assign_role_to_user(v_user_id, p_role_codigo);
END;
$$;

COMMIT;
