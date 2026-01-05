-- =========================================
-- Fix: handle_new_user() deve criar pessoa e preencher profiles.pessoa_id
-- =========================================

-- 1) Funcao utilitaria segura para obter nome "humano" do usuario
-- (usa full_name, name, ou cai no email)
create or replace function public._get_user_display_name(p_user jsonb)
returns text
language plpgsql
as $$
declare
  v_full_name text;
  v_name text;
  v_email text;
begin
  v_full_name := coalesce(p_user->'raw_user_meta_data'->>'full_name', null);
  v_name := coalesce(p_user->'raw_user_meta_data'->>'name', null);
  v_email := coalesce(p_user->>'email', null);

  return coalesce(nullif(v_full_name, ''), nullif(v_name, ''), nullif(v_email, ''), 'Usuario');
end;
$$;

-- 2) Recriar handle_new_user com criacao de pessoa + profile completo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pessoa_id bigint;
  v_nome text;
begin
  -- Se ja existe profile (re-entrancia), nao faz nada.
  if exists (select 1 from public.profiles p where p.user_id = new.id) then
    return new;
  end if;

  v_nome := public._get_user_display_name(to_jsonb(new));

  -- Criar pessoa minima
  insert into public.pessoas (nome, email, user_id, ativo, created_at, updated_at)
  values (v_nome, new.email, new.id, true, now(), now())
  returning id into v_pessoa_id;

  -- Criar profile preenchendo pessoa_id
  insert into public.profiles (user_id, pessoa_id, full_name, created_at)
  values (new.id, v_pessoa_id, v_nome, now());

  return new;
end;
$$;

-- 3) Garantir que o trigger em auth.users aponta para a funcao correta
-- (ajuste o nome do trigger se no seu banco ele for diferente)
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    -- ok, ja existe; apenas garantir a funcao
    null;
  else
    -- alguns projetos nao tem o trigger criado aqui; nao criaremos automaticamente para nao conflitar.
    null;
  end if;
end $$;

-- 4) (Opcional) Comentario de governanca
comment on function public.handle_new_user() is
  'Cria pessoa minima e profile com pessoa_id preenchido (profiles.pessoa_id NOT NULL).';
