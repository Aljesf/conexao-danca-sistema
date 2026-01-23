-- Vinculo entre auth.users (Supabase) e public.pessoas (cadastro interno).
-- Motivo: listar usuarios do Auth e vincular a uma Pessoa interna para permissoes/fluxos do sistema.

create table if not exists public.usuario_pessoa_vinculos (
  user_id uuid not null,
  pessoa_id bigint not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint pk_usuario_pessoa_vinculos primary key (user_id),
  constraint fk_usuario_pessoa_vinculos_user foreign key (user_id) references auth.users (id) on delete cascade,
  constraint fk_usuario_pessoa_vinculos_pessoa foreign key (pessoa_id) references public.pessoas (id) on delete restrict
);

create index if not exists ix_usuario_pessoa_vinculos_pessoa on public.usuario_pessoa_vinculos (pessoa_id);

-- Trigger simples de updated_at (se voce ja tem funcao padrao, pode reaproveitar; aqui fica idempotente).
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'touch_updated_at' and pg_function_is_visible(oid)
  ) then
    create or replace function public.touch_updated_at()
    returns trigger
    language plpgsql
    as $f$
    begin
      new.updated_at = now();
      return new;
    end;
    $f$;
  end if;
end
$$;

drop trigger if exists trg_usuario_pessoa_vinculos_updated_at on public.usuario_pessoa_vinculos;
create trigger trg_usuario_pessoa_vinculos_updated_at
before update on public.usuario_pessoa_vinculos
for each row execute function public.touch_updated_at();

-- Permissoes minimas (ajuste conforme seu modelo):
-- leitura: authenticated (para exibir vinculo em telas administrativas, mas normalmente via API admin)
grant select on public.usuario_pessoa_vinculos to authenticated;
