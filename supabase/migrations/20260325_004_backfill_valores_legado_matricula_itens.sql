-- Backfill conservador de valores para matricula_itens legados
-- Data de referencia: 2026-03-25
--
-- Regra aplicada:
-- - somente matriculas com exatamente 1 item em public.matricula_itens
-- - somente itens de origem LEGADO
-- - somente quando valor_base_centavos = 0 e valor_liquido_centavos = 0
-- - somente quando public.matriculas.total_mensalidade_centavos > 0
--
-- Objetivo:
-- restaurar o vinculo minimo de valor sem inventar rateio historico onde a
-- granularidade antiga nao permite distinguir modulos múltiplos.

begin;

with matriculas_item_unico as (
  select mi.matricula_id
  from public.matricula_itens mi
  group by mi.matricula_id
  having count(*) = 1
),
alvos as (
  select
    mi.id,
    mi.observacoes,
    m.total_mensalidade_centavos
  from public.matricula_itens mi
  join matriculas_item_unico u
    on u.matricula_id = mi.matricula_id
  join public.matriculas m
    on m.id = mi.matricula_id
  where mi.origem_tipo = 'LEGADO'
    and coalesce(mi.valor_base_centavos, 0) = 0
    and coalesce(mi.valor_liquido_centavos, 0) = 0
    and coalesce(m.total_mensalidade_centavos, 0) > 0
)
update public.matricula_itens mi
set
  valor_base_centavos = a.total_mensalidade_centavos,
  valor_liquido_centavos = a.total_mensalidade_centavos,
  observacoes = case
    when coalesce(nullif(btrim(mi.observacoes), ''), '') = '' then
      'Backfill de valor legado em 2026-03-25'
    when mi.observacoes ilike '%Backfill de valor legado em 2026-03-25%' then
      mi.observacoes
    else
      mi.observacoes || ' | Backfill de valor legado em 2026-03-25'
  end,
  updated_at = now()
from alvos a
where mi.id = a.id;

commit;

-- Verificacao sugerida:
-- select count(*) from public.matricula_itens where origem_tipo = 'LEGADO' and valor_liquido_centavos = 0;
-- select id, matricula_id, valor_base_centavos, valor_liquido_centavos from public.matricula_itens where matricula_id = 49;
