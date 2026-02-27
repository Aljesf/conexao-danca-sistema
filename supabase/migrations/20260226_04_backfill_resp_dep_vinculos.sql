begin;

-- Backfill historico dos vinculos responsavel -> dependente
-- Regra: cria vinculo quando responsavel_financeiro_id != pessoa_id
-- Estrategia anti-duplicidade:
-- 1) DISTINCT ON para pegar 1 linha por par (responsavel, dependente)
-- 2) ON CONFLICT para idempotencia (se ja existir, atualiza origem_id/origem_tipo e seta ativo=true)

with base as (
  select distinct on (m.responsavel_financeiro_id, m.pessoa_id)
    m.responsavel_financeiro_id as responsavel_pessoa_id,
    m.pessoa_id as dependente_pessoa_id,
    m.id as origem_id
  from public.matriculas m
  where
    m.responsavel_financeiro_id is not null
    and m.pessoa_id is not null
    and m.responsavel_financeiro_id <> m.pessoa_id
  order by
    m.responsavel_financeiro_id,
    m.pessoa_id,
    m.id desc
)
insert into public.pessoa_responsavel_financeiro_vinculos (
  responsavel_pessoa_id,
  dependente_pessoa_id,
  origem_tipo,
  origem_id,
  ativo
)
select
  b.responsavel_pessoa_id,
  b.dependente_pessoa_id,
  'MATRICULA'::text as origem_tipo,
  b.origem_id,
  true as ativo
from base b
on conflict (responsavel_pessoa_id, dependente_pessoa_id)
do update set
  ativo = true,
  origem_tipo = excluded.origem_tipo,
  origem_id = excluded.origem_id,
  atualizado_em = now();

commit;
