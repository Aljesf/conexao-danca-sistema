-- Protege a geracao de cobrancas do modulo de eventos por inscricao/parcela.
-- Esta migration nao remove cobrancas duplicadas existentes.
-- O schema atual usa cobrancas.origem_id bigint, enquanto a inscricao de evento e UUID.
-- Por isso, a referencia idempotente da inscricao passa a ser gravada em uma coluna UUID dedicada.

alter table public.cobrancas
  add column if not exists origem_evento_inscricao_id uuid;

comment on column public.cobrancas.origem_evento_inscricao_id is
  'UUID da inscricao de evento usado para idempotencia de cobrancas EVENTO_ESCOLA_INSCRICAO.';

do $$
declare
  duplicidades_existentes integer := 0;
begin
  select count(*)
    into duplicidades_existentes
  from (
    select
      origem_label,
      competencia_ano_mes,
      count(*) as total
    from public.cobrancas
    where origem_tipo = 'EVENTO_ESCOLA_INSCRICAO'
    group by origem_label, competencia_ano_mes
    having count(*) > 1
  ) duplicados;

  raise notice
    'Duplicidades existentes em cobrancas de evento antes da protecao: %',
    duplicidades_existentes;
end
$$;

create unique index if not exists ux_cobrancas_evento_escola_inscricao_parcela
  on public.cobrancas (origem_tipo, origem_evento_inscricao_id, parcela_numero)
  where origem_tipo = 'EVENTO_ESCOLA_INSCRICAO'
    and origem_evento_inscricao_id is not null
    and parcela_numero is not null;

comment on index public.ux_cobrancas_evento_escola_inscricao_parcela is
  'Impede novas cobrancas duplicadas por inscricao/parcela no modulo EVENTO_ESCOLA_INSCRICAO.';
