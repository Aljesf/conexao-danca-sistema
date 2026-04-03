-- M6: Adiciona dia de corte do pró-rata (hoje hardcoded como 12)
-- M7: Adiciona data limite do exercício fiscal

alter table public.escola_config_financeira
  add column if not exists dia_corte_prorata integer not null default 12;

comment on column public.escola_config_financeira.dia_corte_prorata is
  'Dia de corte do pró-rata na matrícula. Matrícula até esse dia = mensalidade cheia; após = pró-rata.';

alter table public.escola_config_financeira
  add column if not exists data_limite_exercicio date;

comment on column public.escola_config_financeira.data_limite_exercicio is
  'Data limite para geração de cobranças do exercício fiscal corrente.';

-- Popular valor padrão para o exercício atual
update public.escola_config_financeira
set data_limite_exercicio = '2026-12-12'::date
where data_limite_exercicio is null;
