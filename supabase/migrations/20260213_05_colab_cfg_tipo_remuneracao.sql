alter table public.colaborador_config_financeira
  add column if not exists tipo_remuneracao text not null default 'MENSAL',
  add column if not exists valor_hora_centavos integer not null default 0;

comment on column public.colaborador_config_financeira.tipo_remuneracao is
  'MENSAL | HORISTA. Controla como a remuneracao sera apurada.';

comment on column public.colaborador_config_financeira.valor_hora_centavos is
  'Valor hora em centavos (usado quando tipo_remuneracao=HORISTA).';
