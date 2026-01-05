begin;

-- =========================================
-- Contexto de Matricula como propriedade do SERVICO (Curso Livre / Projeto Artistico)
-- CURSO_REGULAR continua ancorado em Periodo Letivo (escola_contextos_matricula tipo=PERIODO_LETIVO)
-- =========================================

-- 1) Adicionar coluna contexto_matricula_id no servico/produto educacional
alter table public.escola_produtos_educacionais
  add column if not exists contexto_matricula_id bigint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'escola_produtos_educacionais_contexto_matricula_id_fkey'
  ) then
    alter table public.escola_produtos_educacionais
      add constraint escola_produtos_educacionais_contexto_matricula_id_fkey
      foreign key (contexto_matricula_id)
      references public.escola_contextos_matricula(id)
      on delete set null
      deferrable initially immediate;
  end if;
end $$;

create index if not exists idx_epe_contexto_matricula
  on public.escola_produtos_educacionais(contexto_matricula_id);

-- 2) Backfill: criar contextos para CURSO_LIVRE e PROJETO_ARTISTICO por servico
with servs as (
  select
    s.id as servico_id,
    s.titulo as servico_titulo,
    s.tipo as servico_tipo
  from public.escola_produtos_educacionais s
  where s.tipo in ('CURSO_LIVRE', 'PROJETO_ARTISTICO')
),
ins as (
  insert into public.escola_contextos_matricula (tipo, titulo, status)
  select
    case
      when servs.servico_tipo = 'CURSO_LIVRE' then 'CURSO_LIVRE'
      else 'PROJETO_ARTISTICO'
    end as tipo,
    servs.servico_titulo as titulo,
    'ATIVO' as status
  from servs
  where not exists (
    select 1
    from public.escola_contextos_matricula c
    where c.titulo = servs.servico_titulo
      and c.tipo = case
        when servs.servico_tipo = 'CURSO_LIVRE' then 'CURSO_LIVRE'
        else 'PROJETO_ARTISTICO'
      end
  )
  returning id, tipo, titulo
)
update public.escola_produtos_educacionais s
set contexto_matricula_id = c.id
from public.escola_contextos_matricula c
where s.tipo in ('CURSO_LIVRE', 'PROJETO_ARTISTICO')
  and s.contexto_matricula_id is null
  and c.titulo = s.titulo
  and c.tipo = case
    when s.tipo = 'CURSO_LIVRE' then 'CURSO_LIVRE'
    else 'PROJETO_ARTISTICO'
  end;

commit;
