-- =========================================
-- Auth: allowlist de emails permitidos para criacao de usuario
-- Objetivo: impedir que "qualquer pessoa" crie usuario, mantendo profiles.pessoa_id NOT NULL.
-- =========================================

create table if not exists public.auth_signup_allowlist (
  id bigserial primary key,
  email text not null unique,
  ativo boolean not null default true,
  observacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_allowlist_ativo
  on public.auth_signup_allowlist(ativo);

-- Trigger updated_at especifico
do $$
begin
  if not exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'set_updated_at_auth_signup_allowlist'
  ) then
    execute $fn$
      create function public.set_updated_at_auth_signup_allowlist()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $fn$;
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_auth_allowlist_updated_at'
  ) then
    execute $trg$
      create trigger trg_auth_allowlist_updated_at
      before update on public.auth_signup_allowlist
      for each row
      execute function public.set_updated_at_auth_signup_allowlist();
    $trg$;
  end if;
end $$;

-- Seed minimo (adicione seus emails reais aqui)
-- Ajuste os emails antes de aplicar em producao.
insert into public.auth_signup_allowlist (email, ativo, observacoes)
values
  ('SEU_EMAIL_AQUI@exemplo.com', true, 'Admin principal')
on conflict (email) do nothing;

-- =========================================
-- Atualizar handle_new_user para exigir allowlist
-- =========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pessoa_id bigint;
  v_nome text;
  v_autorizado boolean;
begin
  -- 1) Se ja existe profile (re-entrancia), nao faz nada.
  if exists (select 1 from public.profiles p where p.user_id = new.id) then
    return new;
  end if;

  -- 2) Bloquear criacao se o email nao estiver na allowlist ativa
  select exists (
    select 1
    from public.auth_signup_allowlist a
    where lower(a.email) = lower(new.email)
      and a.ativo = true
  ) into v_autorizado;

  if not v_autorizado then
    -- Impede criacao do user/profile. Mantem o sistema fechado.
    raise exception 'Signup nao autorizado para este email.';
  end if;

  -- 3) Nome exibivel
  v_nome := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.email, ''),
    'Usuario'
  );

  -- 4) Criar pessoa minima
  insert into public.pessoas (nome, email, user_id, ativo, created_at, updated_at)
  values (v_nome, new.email, new.id, true, now(), now())
  returning id into v_pessoa_id;

  -- 5) Criar profile preenchendo pessoa_id (NOT NULL)
  insert into public.profiles (user_id, pessoa_id, full_name, created_at)
  values (new.id, v_pessoa_id, v_nome, now());

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Cria pessoa/profile apenas para emails allowlist. Impede signup nao autorizado.';
