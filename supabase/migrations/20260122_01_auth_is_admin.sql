-- 1) Função canônica: é admin?
-- Critério: profiles.is_admin = true OU possui role 'ADMIN' em roles_sistema via usuario_roles
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (select p.is_admin from public.profiles p where p.user_id = p_user_id),
      false
    )
    or exists (
      select 1
      from public.usuario_roles ur
      join public.roles_sistema rs on rs.id = ur.role_id
      where ur.user_id = p_user_id
        and rs.codigo = 'ADMIN'
        and rs.ativo = true
    );
$$;

-- 2) Helper: listar usuários/roles rapidamente (para diagnosticar Abraão)
-- (somente SELECT; não altera nada)
-- Rode manualmente no SQL editor quando precisar:
-- select p.user_id, p.full_name, p.is_admin
-- from public.profiles p
-- where p.full_name ilike '%abra%';
--
-- select ur.user_id, rs.codigo, rs.nome
-- from public.usuario_roles ur
-- join public.roles_sistema rs on rs.id = ur.role_id
-- where ur.user_id = '<UUID_DO_USUARIO_AQUI>';
