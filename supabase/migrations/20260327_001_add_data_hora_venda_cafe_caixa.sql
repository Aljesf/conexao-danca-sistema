begin;

-- Registro operacional do Ballet Cafe:
-- adiciona a data/hora real da venda para leituras operacionais
-- sem introduzir campos paralelos fora da regra atual do caixa.

alter table public.cafe_vendas
  add column if not exists data_hora_venda timestamptz;

update public.cafe_vendas
set data_hora_venda = coalesce(data_hora_venda, created_at)
where data_hora_venda is null;

create index if not exists idx_cafe_vendas_data_hora_venda
  on public.cafe_vendas (data_hora_venda desc);

alter table public.cafe_vendas
  alter column data_hora_venda set not null;

comment on column public.cafe_vendas.data_hora_venda is
  'Data e hora reais da venda fora do PDV, usada para leitura operacional e analise de picos.';

commit;
