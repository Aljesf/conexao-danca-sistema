-- Seed de formas de pagamento por contexto para o Centro de Custo do Cafe (id=3)
-- Estrategia: copiar as formas de pagamento ja configuradas para outro centro (preferencia: LOJA; fallback: ESCOLA)
-- Sem criar novas formas, apenas configurar contexto.
-- Idempotente: nao duplica.

do $$
declare
  v_cafe_id bigint := 3;
  v_src_id bigint;
begin
  -- Fonte preferencial: centro de custo da LOJA (por codigo 'LOJA')
  select id into v_src_id
  from public.centros_custo
  where upper(trim(codigo)) = 'LOJA'
  limit 1;

  -- Fallback: ESCOLA
  if v_src_id is null then
    select id into v_src_id
    from public.centros_custo
    where upper(trim(codigo)) = 'ESCOLA'
    limit 1;
  end if;

  if v_src_id is null then
    raise exception 'Nao foi possivel localizar centro de custo fonte (LOJA/ESCOLA) para copiar formas_pagamento_contexto.';
  end if;

  -- Copiar contexto
  insert into public.formas_pagamento_contexto (
    centro_custo_id,
    forma_pagamento_codigo,
    descricao_exibicao,
    ativo,
    ordem_exibicao,
    conta_financeira_id,
    cartao_maquina_id,
    carteira_tipo,
    created_at,
    updated_at
  )
  select
    v_cafe_id as centro_custo_id,
    fpc.forma_pagamento_codigo,
    fpc.descricao_exibicao,
    fpc.ativo,
    fpc.ordem_exibicao,
    fpc.conta_financeira_id,
    fpc.cartao_maquina_id,
    fpc.carteira_tipo,
    now(),
    now()
  from public.formas_pagamento_contexto fpc
  where fpc.centro_custo_id = v_src_id
    and not exists (
      select 1
      from public.formas_pagamento_contexto x
      where x.centro_custo_id = v_cafe_id
        and x.forma_pagamento_codigo = fpc.forma_pagamento_codigo
    );
end $$;
