create or replace function public._calc_data_pagamento_prevista(
  p_competencia text,
  p_dia_pagamento int,
  p_mes_seguinte boolean
)
returns date
language plpgsql
immutable
as $$
declare
  y int;
  m int;
  base date;
  alvo_inicio date;
  ultimo_dia int;
  dia_ajustado int;
begin
  y := split_part(p_competencia, '-', 1)::int;
  m := split_part(p_competencia, '-', 2)::int;
  base := make_date(y, m, 1);

  if p_mes_seguinte then
    alvo_inicio := (date_trunc('month', base)::date + interval '1 month')::date;
  else
    alvo_inicio := date_trunc('month', base)::date;
  end if;

  ultimo_dia := extract(day from (date_trunc('month', alvo_inicio)::date + interval '1 month - 1 day'))::int;
  dia_ajustado := least(greatest(p_dia_pagamento, 1), ultimo_dia);

  return make_date(
    extract(year from alvo_inicio)::int,
    extract(month from alvo_inicio)::int,
    dia_ajustado
  );
end;
$$;

create or replace function public.folha_atualizar_data_pagamento_prevista(p_competencia text)
returns void
language plpgsql
as $$
declare
  v_dia int;
  v_mes_seguinte boolean;
  v_data date;
begin
  select
    greatest(1, least(31, coalesce(max(cfg.dia_pagamento), 5))) as dia,
    coalesce(bool_or(cfg.pagamento_no_mes_seguinte), true) as mes_seguinte
  into v_dia, v_mes_seguinte
  from public.colaborador_config_financeira cfg
  join public.colaboradores c on c.id = cfg.colaborador_id
  where cfg.gera_folha = true
    and cfg.ativo = true
    and c.ativo = true;

  v_data := public._calc_data_pagamento_prevista(p_competencia, v_dia, v_mes_seguinte);

  update public.folha_pagamento
  set data_pagamento_prevista = v_data
  where competencia = p_competencia;
end;
$$;

create or replace function public.folha_gerar_espelho_competencia(p_competencia text)
returns void
language plpgsql
as $$
declare
  v_folha_id bigint;
begin
  insert into public.folha_pagamento (competencia, status)
  values (p_competencia, 'ABERTA')
  on conflict (competencia) do nothing;

  perform public.folha_atualizar_data_pagamento_prevista(p_competencia);

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
