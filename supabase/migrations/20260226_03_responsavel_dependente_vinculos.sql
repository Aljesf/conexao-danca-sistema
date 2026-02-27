begin;

create table if not exists public.pessoa_responsavel_financeiro_vinculos (
  id bigserial primary key,
  responsavel_pessoa_id bigint not null references public.pessoas(id) on delete cascade,
  dependente_pessoa_id bigint not null references public.pessoas(id) on delete cascade,
  origem_tipo text null,
  origem_id bigint null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (responsavel_pessoa_id, dependente_pessoa_id)
);

create index if not exists idx_resp_dep_responsavel
  on public.pessoa_responsavel_financeiro_vinculos (responsavel_pessoa_id);

create index if not exists idx_resp_dep_dependente
  on public.pessoa_responsavel_financeiro_vinculos (dependente_pessoa_id);

create or replace function public.touch_updated_at_resp_dep()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_resp_dep on public.pessoa_responsavel_financeiro_vinculos;
create trigger trg_touch_resp_dep
before update on public.pessoa_responsavel_financeiro_vinculos
for each row
execute function public.touch_updated_at_resp_dep();

create or replace function public.sync_vinculo_resp_dep_from_matricula()
returns trigger
language plpgsql
as $$
declare
  resp_id bigint;
  dep_id bigint;
begin
  resp_id := new.responsavel_financeiro_id;
  dep_id := new.pessoa_id;

  if resp_id is null or dep_id is null or resp_id = dep_id then
    return new;
  end if;

  insert into public.pessoa_responsavel_financeiro_vinculos (
    responsavel_pessoa_id,
    dependente_pessoa_id,
    origem_tipo,
    origem_id,
    ativo
  ) values (
    resp_id,
    dep_id,
    'MATRICULA',
    new.id,
    true
  )
  on conflict (responsavel_pessoa_id, dependente_pessoa_id)
  do update set
    ativo = true,
    origem_tipo = excluded.origem_tipo,
    origem_id = excluded.origem_id,
    atualizado_em = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_resp_dep_matricula_ins on public.matriculas;
create trigger trg_sync_resp_dep_matricula_ins
after insert on public.matriculas
for each row
execute function public.sync_vinculo_resp_dep_from_matricula();

drop trigger if exists trg_sync_resp_dep_matricula_upd on public.matriculas;
create trigger trg_sync_resp_dep_matricula_upd
after update of responsavel_financeiro_id on public.matriculas
for each row
execute function public.sync_vinculo_resp_dep_from_matricula();

create or replace view public.vw_responsavel_financeiro_dependentes as
select
  v.responsavel_pessoa_id,
  v.dependente_pessoa_id,
  p.nome as dependente_nome,
  p.cpf as dependente_cpf,
  p.telefone as dependente_telefone,
  v.ativo,
  v.origem_tipo,
  v.origem_id,
  v.atualizado_em
from public.pessoa_responsavel_financeiro_vinculos v
join public.pessoas p on p.id = v.dependente_pessoa_id;

create or replace view public.vw_dependente_financeiro_responsaveis as
select
  v.dependente_pessoa_id,
  v.responsavel_pessoa_id,
  p.nome as responsavel_nome,
  p.cpf as responsavel_cpf,
  p.telefone as responsavel_telefone,
  v.ativo,
  v.origem_tipo,
  v.origem_id,
  v.atualizado_em
from public.pessoa_responsavel_financeiro_vinculos v
join public.pessoas p on p.id = v.responsavel_pessoa_id;

commit;
