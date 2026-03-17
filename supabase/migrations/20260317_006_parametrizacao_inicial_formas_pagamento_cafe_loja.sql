begin;

-- Parametrizacao inicial do cadastro central legado:
-- public.formas_pagamento + public.formas_pagamento_contexto.
-- Sem ids fixos. Reaproveita maquininha e contas financeiras ja existentes.

do $$
declare
  v_cafe_centro_id bigint;
  v_loja_centro_id bigint;
  v_cafe_caixa_id bigint;
  v_loja_caixa_id bigint;
  v_mp_maquina_id bigint;
  v_mp_conta_id bigint;
  v_credito_codigo text;
  v_aluno_codigo text;
  v_colab_codigo text;
begin
  select cc.id
    into v_cafe_centro_id
  from public.centros_custo cc
  where coalesce(cc.ativo, true) = true
    and (
      upper(trim(coalesce(cc.codigo, ''))) = 'CAFE'
      or upper(trim(coalesce(cc.nome, ''))) like '%CAFE%'
    )
  order by cc.id
  limit 1;

  select cc.id
    into v_loja_centro_id
  from public.centros_custo cc
  where coalesce(cc.ativo, true) = true
    and (
      upper(trim(coalesce(cc.codigo, ''))) = 'LOJA'
      or upper(trim(coalesce(cc.nome, ''))) like '%LOJA%'
      or upper(trim(coalesce(cc.nome, ''))) like '%STORE%'
    )
  order by cc.id
  limit 1;

  select cf.id
    into v_cafe_caixa_id
  from public.contas_financeiras cf
  where coalesce(cf.ativo, true) = true
    and cf.centro_custo_id = v_cafe_centro_id
    and (
      upper(trim(coalesce(cf.codigo, ''))) = 'CAFE_CAIXA'
      or upper(trim(coalesce(cf.nome, ''))) like '%CAIXA%CAFE%'
    )
  order by cf.id
  limit 1;

  select cf.id
    into v_loja_caixa_id
  from public.contas_financeiras cf
  where coalesce(cf.ativo, true) = true
    and cf.centro_custo_id = v_loja_centro_id
    and (
      upper(trim(coalesce(cf.codigo, ''))) = 'LOJA_CAIXA'
      or upper(trim(coalesce(cf.nome, ''))) like '%CAIXA%LOJA%'
      or upper(trim(coalesce(cf.nome, ''))) like '%CAIXA%STORE%'
    )
  order by cf.id
  limit 1;

  select cm.id, cm.conta_financeira_id
    into v_mp_maquina_id, v_mp_conta_id
  from public.cartao_maquinas cm
  where coalesce(cm.ativo, true) = true
    and (
      upper(trim(coalesce(cm.nome, ''))) like '%MERCADO%PAGO%'
      or upper(trim(coalesce(cm.operadora, ''))) like '%MERCADO%PAGO%'
    )
  order by
    case when cm.centro_custo_id = v_loja_centro_id then 0 else 1 end,
    cm.id
  limit 1;

  select fp.codigo
    into v_credito_codigo
  from public.formas_pagamento fp
  where coalesce(fp.ativo, true) = true
    and upper(trim(fp.codigo)) in ('CREDITO_AVISTA', 'DEBITO')
  order by
    case
      when upper(trim(fp.codigo)) = 'CREDITO_AVISTA' then 0
      when upper(trim(fp.codigo)) = 'DEBITO' then 1
      else 9
    end,
    fp.id
  limit 1;

  select fp.codigo
    into v_aluno_codigo
  from public.formas_pagamento fp
  where coalesce(fp.ativo, true) = true
    and upper(trim(fp.codigo)) in ('CONTA_INTERNA_ALUNO', 'CARTAO_CONEXAO_ALUNO', 'CREDITO_ALUNO')
  order by
    case
      when upper(trim(fp.codigo)) = 'CONTA_INTERNA_ALUNO' then 0
      when upper(trim(fp.codigo)) = 'CARTAO_CONEXAO_ALUNO' then 1
      when upper(trim(fp.codigo)) = 'CREDITO_ALUNO' then 2
      else 9
    end,
    fp.id
  limit 1;

  select fp.codigo
    into v_colab_codigo
  from public.formas_pagamento fp
  where coalesce(fp.ativo, true) = true
    and upper(trim(fp.codigo)) in (
      'CONTA_INTERNA_COLABORADOR',
      'CARTAO_CONEXAO_COLAB',
      'CARTAO_CONEXAO_COLABORADOR',
      'CREDIARIO_COLAB',
      'CONTA_INTERNA'
    )
  order by
    case
      when upper(trim(fp.codigo)) = 'CONTA_INTERNA_COLABORADOR' then 0
      when upper(trim(fp.codigo)) = 'CARTAO_CONEXAO_COLAB' then 1
      when upper(trim(fp.codigo)) = 'CARTAO_CONEXAO_COLABORADOR' then 2
      when upper(trim(fp.codigo)) = 'CREDIARIO_COLAB' then 3
      when upper(trim(fp.codigo)) = 'CONTA_INTERNA' then 4
      else 9
    end,
    fp.id
  limit 1;

  if v_cafe_centro_id is not null then
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
    values
      (v_cafe_centro_id, 'DINHEIRO', 'Dinheiro', true, 10, v_cafe_caixa_id, null, null, now(), now()),
      (v_cafe_centro_id, 'PIX', 'Pix', true, 20, v_mp_conta_id, null, null, now(), now())
    on conflict (centro_custo_id, forma_pagamento_codigo) do update
      set descricao_exibicao = excluded.descricao_exibicao,
          ativo = excluded.ativo,
          ordem_exibicao = excluded.ordem_exibicao,
          conta_financeira_id = excluded.conta_financeira_id,
          cartao_maquina_id = excluded.cartao_maquina_id,
          carteira_tipo = excluded.carteira_tipo,
          updated_at = now();

    if v_credito_codigo is not null then
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
      values (
        v_cafe_centro_id,
        v_credito_codigo,
        'Credito a vista',
        true,
        30,
        v_mp_conta_id,
        v_mp_maquina_id,
        null,
        now(),
        now()
      )
      on conflict (centro_custo_id, forma_pagamento_codigo) do update
        set descricao_exibicao = excluded.descricao_exibicao,
            ativo = excluded.ativo,
            ordem_exibicao = excluded.ordem_exibicao,
            conta_financeira_id = excluded.conta_financeira_id,
            cartao_maquina_id = excluded.cartao_maquina_id,
            carteira_tipo = excluded.carteira_tipo,
            updated_at = now();
    end if;

    if v_aluno_codigo is not null then
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
      values (
        v_cafe_centro_id,
        v_aluno_codigo,
        'Conta interna do aluno',
        true,
        40,
        null,
        null,
        'ALUNO',
        now(),
        now()
      )
      on conflict (centro_custo_id, forma_pagamento_codigo) do update
        set descricao_exibicao = excluded.descricao_exibicao,
            ativo = excluded.ativo,
            ordem_exibicao = excluded.ordem_exibicao,
            conta_financeira_id = excluded.conta_financeira_id,
            cartao_maquina_id = excluded.cartao_maquina_id,
            carteira_tipo = excluded.carteira_tipo,
            updated_at = now();
    end if;

    if v_colab_codigo is not null then
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
      values (
        v_cafe_centro_id,
        v_colab_codigo,
        'Conta interna do colaborador',
        true,
        50,
        null,
        null,
        'COLABORADOR',
        now(),
        now()
      )
      on conflict (centro_custo_id, forma_pagamento_codigo) do update
        set descricao_exibicao = excluded.descricao_exibicao,
            ativo = excluded.ativo,
            ordem_exibicao = excluded.ordem_exibicao,
            conta_financeira_id = excluded.conta_financeira_id,
            cartao_maquina_id = excluded.cartao_maquina_id,
            carteira_tipo = excluded.carteira_tipo,
            updated_at = now();
    end if;
  end if;

  if v_loja_centro_id is not null then
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
    values
      (v_loja_centro_id, 'DINHEIRO', 'Dinheiro', true, 10, v_loja_caixa_id, null, null, now(), now()),
      (v_loja_centro_id, 'PIX', 'Pix', true, 20, v_mp_conta_id, null, null, now(), now())
    on conflict (centro_custo_id, forma_pagamento_codigo) do update
      set descricao_exibicao = excluded.descricao_exibicao,
          ativo = excluded.ativo,
          ordem_exibicao = excluded.ordem_exibicao,
          conta_financeira_id = excluded.conta_financeira_id,
          cartao_maquina_id = excluded.cartao_maquina_id,
          carteira_tipo = excluded.carteira_tipo,
          updated_at = now();

    if v_credito_codigo is not null then
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
      values (
        v_loja_centro_id,
        v_credito_codigo,
        'Credito a vista',
        true,
        30,
        v_mp_conta_id,
        v_mp_maquina_id,
        null,
        now(),
        now()
      )
      on conflict (centro_custo_id, forma_pagamento_codigo) do update
        set descricao_exibicao = excluded.descricao_exibicao,
            ativo = excluded.ativo,
            ordem_exibicao = excluded.ordem_exibicao,
            conta_financeira_id = excluded.conta_financeira_id,
            cartao_maquina_id = excluded.cartao_maquina_id,
            carteira_tipo = excluded.carteira_tipo,
            updated_at = now();
    end if;
  end if;

  if v_loja_centro_id is not null then
    update public.formas_pagamento_contexto
    set
      ativo = case
        when upper(trim(forma_pagamento_codigo)) in ('DINHEIRO', 'PIX', coalesce(upper(trim(v_credito_codigo)), '__NONE__'))
          then true
        else false
      end,
      updated_at = now()
    where centro_custo_id = v_loja_centro_id
      and upper(trim(forma_pagamento_codigo)) in (
        'DINHEIRO',
        'PIX',
        'CREDITO_AVISTA',
        'DEBITO',
        'CREDITO_PARCELADO',
        'CREDIARIO',
        'CREDIARIO_COLAB',
        'CREDITO_ALUNO',
        'CARTAO_CONEXAO_ALUNO',
        'CARTAO_CONEXAO_COLAB',
        'CARTAO_CONEXAO_COLABORADOR',
        'CONTA_INTERNA',
        'CONTA_INTERNA_ALUNO',
        'CONTA_INTERNA_COLABORADOR'
      );
  end if;

  if v_cafe_centro_id is not null then
    update public.formas_pagamento_contexto
    set
      ativo = case
        when upper(trim(forma_pagamento_codigo)) in (
          'DINHEIRO',
          'PIX',
          coalesce(upper(trim(v_credito_codigo)), '__NONE__'),
          coalesce(upper(trim(v_aluno_codigo)), '__NONE__'),
          coalesce(upper(trim(v_colab_codigo)), '__NONE__')
        ) then true
        else false
      end,
      updated_at = now()
    where centro_custo_id = v_cafe_centro_id
      and upper(trim(forma_pagamento_codigo)) in (
        'DINHEIRO',
        'PIX',
        'CREDITO_AVISTA',
        'DEBITO',
        'CREDITO_PARCELADO',
        'CREDIARIO',
        'CREDIARIO_COLAB',
        'CREDITO_ALUNO',
        'CARTAO_CONEXAO_ALUNO',
        'CARTAO_CONEXAO_COLAB',
        'CARTAO_CONEXAO_COLABORADOR',
        'CONTA_INTERNA',
        'CONTA_INTERNA_ALUNO',
        'CONTA_INTERNA_COLABORADOR'
      );
  end if;

  raise notice 'Parametros aplicados: centro CAFE %, centro LOJA %, maquininha MP %, conta MP %',
    v_cafe_centro_id, v_loja_centro_id, v_mp_maquina_id, v_mp_conta_id;
end $$;

commit;
