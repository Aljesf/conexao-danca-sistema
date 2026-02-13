-- =========================================
-- Colaborador config: salario base + flags
-- =========================================
alter table public.colaborador_config_financeira
  add column if not exists salario_base_centavos integer not null default 0;

comment on column public.colaborador_config_financeira.salario_base_centavos is
  'Salario base do colaborador em centavos (provento fixo principal).';

-- =========================================
-- Funcoes utilitarias: adicionar meses e gerar competencia YYYY-MM
-- =========================================
create or replace function public._to_competencia_yyyymm(d date)
returns text language sql immutable as $$
  select to_char(date_trunc('month', d)::date, 'YYYY-MM');
$$;

create or replace function public._add_months_competencia(competencia text, meses integer)
returns text language plpgsql immutable as $$
declare
  y int;
  m int;
  base date;
begin
  y := split_part(competencia, '-', 1)::int;
  m := split_part(competencia, '-', 2)::int;
  base := make_date(y, m, 1);
  return public._to_competencia_yyyymm((base + (meses || ' months')::interval)::date);
end;
$$;

-- =========================================
-- Geracao de espelho por competencia
-- =========================================
create or replace function public.folha_gerar_espelho_competencia(p_competencia text)
returns void language plpgsql as $$
declare
  v_folha_id bigint;
begin
  insert into public.folha_pagamento (competencia, status)
  values (p_competencia, 'ABERTA')
  on conflict (competencia) do nothing;

  select id into v_folha_id
  from public.folha_pagamento
  where competencia = p_competencia
  limit 1;

  delete from public.folha_pagamento_itens i
  using public.colaborador_config_financeira cfg
  where i.folha_id = v_folha_id
    and i.colaborador_id = cfg.colaborador_id
    and i.criado_automatico = true
    and i.tipo_item = 'SALARIO_BASE';

  insert into public.folha_pagamento_itens (
    folha_id,
    colaborador_id,
    tipo_item,
    descricao,
    valor_centavos,
    referencia_tipo,
    referencia_id,
    criado_automatico
  )
  select
    v_folha_id,
    cfg.colaborador_id,
    'SALARIO_BASE',
    'Salario base (espelho automatico)',
    cfg.salario_base_centavos,
    null,
    null,
    true
  from public.colaborador_config_financeira cfg
  join public.colaboradores c on c.id = cfg.colaborador_id
  where cfg.gera_folha = true
    and cfg.ativo = true
    and c.ativo = true;
end;
$$;

create or replace function public.folha_gerar_espelho_proximos_meses(p_competencia_base text, p_meses integer)
returns void language plpgsql as $$
declare
  i int;
  comp text;
begin
  if p_meses is null or p_meses < 1 then
    raise exception 'p_meses deve ser >= 1';
  end if;

  for i in 0..(p_meses - 1) loop
    comp := public._add_months_competencia(p_competencia_base, i);
    perform public.folha_gerar_espelho_competencia(comp);
  end loop;
end;
$$;
