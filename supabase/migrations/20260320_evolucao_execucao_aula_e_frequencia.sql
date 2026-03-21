begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'status_execucao_aula'
  ) then
    create type public.status_execucao_aula as enum (
      'PENDENTE',
      'ABERTA',
      'VALIDADA',
      'NAO_REALIZADA'
    );
  end if;
end $$;

alter table public.turma_aulas
  add column if not exists status_execucao public.status_execucao_aula null,
  add column if not exists aberta_em timestamptz null,
  add column if not exists aberta_por uuid null,
  add column if not exists frequencia_salva_em timestamptz null,
  add column if not exists frequencia_salva_por uuid null,
  add column if not exists observacao_execucao text null;

with ultima_presenca as (
  select distinct on (p.aula_id)
    p.aula_id,
    coalesce(p.updated_at, p.created_at) as salvo_em,
    p.registrado_por as salvo_por
  from public.turma_aula_presencas p
  order by
    p.aula_id,
    coalesce(p.updated_at, p.created_at) desc,
    p.id desc
)
update public.turma_aulas a
set
  aberta_em = coalesce(a.aberta_em, a.created_at),
  aberta_por = coalesce(a.aberta_por, a.criado_por),
  frequencia_salva_em = coalesce(a.frequencia_salva_em, up.salvo_em),
  frequencia_salva_por = coalesce(a.frequencia_salva_por, up.salvo_por),
  status_execucao = coalesce(
    a.status_execucao,
    case
      when a.fechada_em is not null then 'VALIDADA'::public.status_execucao_aula
      when a.aberta_em is not null or a.criado_por is not null then 'ABERTA'::public.status_execucao_aula
      else 'PENDENTE'::public.status_execucao_aula
    end
  )
from ultima_presenca up
where up.aula_id = a.id;

update public.turma_aulas
set
  aberta_em = coalesce(aberta_em, created_at),
  aberta_por = coalesce(aberta_por, criado_por),
  status_execucao = coalesce(
    status_execucao,
    case
      when fechada_em is not null then 'VALIDADA'::public.status_execucao_aula
      when aberta_em is not null or criado_por is not null then 'ABERTA'::public.status_execucao_aula
      else 'PENDENTE'::public.status_execucao_aula
    end
  )
where status_execucao is null
   or aberta_em is null
   or aberta_por is null;

alter table public.turma_aulas
  alter column status_execucao set default 'PENDENTE'::public.status_execucao_aula;

update public.turma_aulas
set status_execucao = 'PENDENTE'::public.status_execucao_aula
where status_execucao is null;

alter table public.turma_aulas
  alter column status_execucao set not null;

create index if not exists idx_turma_aulas_status_execucao
  on public.turma_aulas (status_execucao);

create index if not exists idx_turma_aulas_aberta_por
  on public.turma_aulas (aberta_por);

create index if not exists idx_turma_aulas_fechada_por
  on public.turma_aulas (fechada_por);

create index if not exists idx_turma_aulas_frequencia_salva_por
  on public.turma_aulas (frequencia_salva_por);

comment on type public.status_execucao_aula is
'Status persistido da sessao real em turma_aulas. PREVISTA fica como estado derivado da grade/calendario, sem linha materializada obrigatoria.';

comment on column public.turma_aulas.status_execucao is
'Estado operacional da aula real: pendente, aberta, validada ou nao realizada.';

comment on column public.turma_aulas.aberta_em is
'Momento em que a sessao foi efetivamente aberta no Diario de Classe.';

comment on column public.turma_aulas.aberta_por is
'Auth user que abriu a sessao no Diario de Classe.';

comment on column public.turma_aulas.frequencia_salva_em is
'Momento da ultima persistencia valida da frequencia da aula.';

comment on column public.turma_aulas.frequencia_salva_por is
'Auth user responsavel pela ultima persistencia valida da frequencia.';

comment on column public.turma_aulas.observacao_execucao is
'Observacao operacional livre sobre a execucao real da aula.';

commit;
