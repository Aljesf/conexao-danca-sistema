begin;

-- =========================================
-- Conexao Danca - Contexto de Matricula
-- Cria tabela canonica: escola_contextos_matricula
-- Vincula turmas a um contexto temporal institucional
-- =========================================

-- 1) Tipo (enum via CHECK para manter flexivel no Supabase)
-- Tipos possiveis:
-- PERIODO_LETIVO | CURSO_LIVRE | PROJETO_ARTISTICO
create table if not exists public.escola_contextos_matricula (
  id bigserial primary key,
  tipo text not null check (tipo in ('PERIODO_LETIVO', 'CURSO_LIVRE', 'PROJETO_ARTISTICO')),
  titulo text not null,
  ano_referencia integer null,
  data_inicio date null,
  data_fim date null,
  status text not null default 'ATIVO' check (status in ('ATIVO', 'ENCERRADO', 'CANCELADO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ecm_tipo on public.escola_contextos_matricula(tipo);
create index if not exists idx_ecm_ano on public.escola_contextos_matricula(ano_referencia);
create index if not exists idx_ecm_status on public.escola_contextos_matricula(status);

-- 2) Turmas passam a apontar para um contexto de matricula (recorte temporal)
alter table public.turmas
  add column if not exists contexto_matricula_id bigint null;

-- FK (deferrable para reduzir atrito em migracoes futuras)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'turmas_contexto_matricula_id_fkey'
  ) then
    alter table public.turmas
      add constraint turmas_contexto_matricula_id_fkey
      foreign key (contexto_matricula_id)
      references public.escola_contextos_matricula(id)
      on delete set null
      deferrable initially immediate;
  end if;
end $$;

create index if not exists idx_turmas_contexto_matricula on public.turmas(contexto_matricula_id);

-- 3) BACKFILL: cria contextos de PERIODO_LETIVO por ano_referencia existente nas turmas REGULAR
-- Regra: cria 1 contexto por ano (ex.: "Periodo Letivo 2026")
-- e vincula as turmas REGULAR daquele ano ao contexto criado.
with anos as (
  select distinct t.ano_referencia as ano
  from public.turmas t
  where t.tipo_turma = 'REGULAR'
    and t.ano_referencia is not null
),
ins as (
  insert into public.escola_contextos_matricula (tipo, titulo, ano_referencia)
  select
    'PERIODO_LETIVO' as tipo,
    ('Periodo Letivo ' || a.ano::text) as titulo,
    a.ano as ano_referencia
  from anos a
  where not exists (
    select 1
    from public.escola_contextos_matricula e
    where e.tipo = 'PERIODO_LETIVO'
      and e.ano_referencia = a.ano
  )
  returning id, ano_referencia
)
update public.turmas t
set contexto_matricula_id = e.id
from public.escola_contextos_matricula e
where t.tipo_turma = 'REGULAR'
  and t.ano_referencia is not null
  and e.tipo = 'PERIODO_LETIVO'
  and e.ano_referencia = t.ano_referencia
  and (t.contexto_matricula_id is null);

-- 4) Trigger simples de updated_at (se voce ja tiver padrao global, manter so se necessario)
-- Aqui aplicamos apenas se nao existir trigger semelhante.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_escola_contextos_matricula_updated_at'
  ) then
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;

    create trigger trg_escola_contextos_matricula_updated_at
    before update on public.escola_contextos_matricula
    for each row execute function public.set_updated_at();
  end if;
end $$;

commit;

select pg_notify('pgrst', 'reload schema');
