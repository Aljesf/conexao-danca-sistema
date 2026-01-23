-- IMPORTANTE:
-- Nao usar DROP FUNCTION aqui, pois ha policies (RLS) dependentes.
-- Manter a assinatura e o nome do parametro como ja existe no banco: (uid uuid).

create or replace function public.is_admin(uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := false;
begin
  -- 1) Verifica flag direta no profile (se existir)
  begin
    execute 'select coalesce(is_admin,false) from public.profiles where user_id = $1'
      into v_is_admin
      using uid;
    if v_is_admin then
      return true;
    end if;
  exception when undefined_table then
    null;
  end;

  -- 2) Verifica role ADMIN (se existir)
  begin
    execute $q$
      select exists (
        select 1
        from public.usuario_roles ur
        join public.roles_sistema rs on rs.id = ur.role_id
        where ur.user_id = $1
          and rs.codigo = 'ADMIN'
          and coalesce(rs.ativo, true) = true
      )
    $q$
    into v_is_admin
      using uid;

    return coalesce(v_is_admin, false);
  exception when undefined_table then
    return false;
  end;
end;
$$;

grant execute on function public.is_admin(uuid) to authenticated;
