begin;

-- ======================================================
-- 1) LOCAIS
-- ======================================================
create table if not exists public.locais (
  id bigserial primary key,
  nome text not null,
  tipo text not null default 'INTERNO', -- INTERNO | EXTERNO
  endereco text null,
  observacoes text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists locais_nome_uniq
  on public.locais (lower(nome));

-- updated_at trigger para locais
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='locais' and t.tgname='trg_locais_set_updated_at'
  ) then
    create trigger trg_locais_set_updated_at
    before update on public.locais
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

-- ======================================================
-- 2) ESPACOS
-- ======================================================
create table if not exists public.espacos (
  id bigserial primary key,
  local_id bigint not null references public.locais(id) on delete restrict,
  nome text not null,                -- Sala 1, Sala 2, Garagem, Palco
  tipo text not null default 'SALA', -- SALA | PALCO | AREA | OUTRO
  capacidade integer null,
  observacoes text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists espacos_local_nome_uniq
  on public.espacos (local_id, lower(nome));

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='espacos' and t.tgname='trg_espacos_set_updated_at'
  ) then
    create trigger trg_espacos_set_updated_at
    before update on public.espacos
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

create index if not exists espacos_local_id_idx
  on public.espacos (local_id);

-- ======================================================
-- 3) TURMAS -> ESPACO
-- ======================================================
alter table public.turmas
  add column if not exists espaco_id bigint null references public.espacos(id) on delete restrict;

create index if not exists turmas_espaco_id_idx
  on public.turmas (espaco_id);

commit;
