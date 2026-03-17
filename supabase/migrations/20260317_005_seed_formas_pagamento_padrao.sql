begin;

-- Seed canônico das formas centrais no schema legado real.
-- O projeto usa public.formas_pagamento + public.formas_pagamento_contexto.

insert into public.formas_pagamento (
  codigo,
  nome,
  tipo_base,
  tipo_fluxo_saas,
  exige_troco,
  exige_maquininha,
  exige_bandeira,
  exige_conta_interna,
  ativo,
  created_at,
  updated_at
)
select
  seed.codigo,
  seed.nome,
  seed.tipo_base,
  seed.tipo_fluxo_saas,
  seed.exige_troco,
  seed.exige_maquininha,
  seed.exige_bandeira,
  seed.exige_conta_interna,
  true,
  now(),
  now()
from (
  values
    ('DINHEIRO', 'Dinheiro', 'DINHEIRO', 'DINHEIRO', true, false, false, false),
    ('PIX', 'Pix', 'PIX', 'PIX', false, false, false, false),
    ('CREDITO_AVISTA', 'Credito a vista', 'CARTAO', 'CARTAO', false, true, true, false),
    ('DEBITO', 'Debito', 'CARTAO', 'CARTAO', false, true, true, false),
    ('CREDIARIO', 'Crediario', 'CREDIARIO', 'CREDIARIO', false, false, false, false),
    ('CONTA_INTERNA_ALUNO', 'Conta interna do aluno', 'CARTEIRA_INTERNA', 'CONTA_INTERNA_ALUNO', false, false, false, true),
    ('CONTA_INTERNA_COLABORADOR', 'Conta interna do colaborador', 'CARTEIRA_INTERNA', 'CONTA_INTERNA_COLABORADOR', false, false, false, true)
) as seed(codigo, nome, tipo_base, tipo_fluxo_saas, exige_troco, exige_maquininha, exige_bandeira, exige_conta_interna)
where not exists (
  select 1
  from public.formas_pagamento fp
  where upper(trim(fp.codigo)) = seed.codigo
);

update public.formas_pagamento
set
  nome = seed.nome,
  tipo_base = seed.tipo_base,
  tipo_fluxo_saas = seed.tipo_fluxo_saas,
  exige_troco = seed.exige_troco,
  exige_maquininha = seed.exige_maquininha,
  exige_bandeira = seed.exige_bandeira,
  exige_conta_interna = seed.exige_conta_interna,
  ativo = true,
  updated_at = now()
from (
  values
    ('DINHEIRO', 'Dinheiro', 'DINHEIRO', 'DINHEIRO', true, false, false, false),
    ('PIX', 'Pix', 'PIX', 'PIX', false, false, false, false),
    ('CREDITO_AVISTA', 'Credito a vista', 'CARTAO', 'CARTAO', false, true, true, false),
    ('DEBITO', 'Debito', 'CARTAO', 'CARTAO', false, true, true, false),
    ('CREDIARIO', 'Crediario', 'CREDIARIO', 'CREDIARIO', false, false, false, false),
    ('CONTA_INTERNA_ALUNO', 'Conta interna do aluno', 'CARTEIRA_INTERNA', 'CONTA_INTERNA_ALUNO', false, false, false, true),
    ('CONTA_INTERNA_COLABORADOR', 'Conta interna do colaborador', 'CARTEIRA_INTERNA', 'CONTA_INTERNA_COLABORADOR', false, false, false, true)
) as seed(codigo, nome, tipo_base, tipo_fluxo_saas, exige_troco, exige_maquininha, exige_bandeira, exige_conta_interna)
where upper(trim(public.formas_pagamento.codigo)) = seed.codigo;

do $$
declare
  v_cafe_centro_id bigint;
  v_maquininha_cafe_id bigint;
begin
  select cc.id
    into v_cafe_centro_id
  from public.centros_custo cc
  where coalesce(cc.ativo, true) = true
    and (
      upper(trim(coalesce(cc.codigo, ''))) in ('CAFE', 'BALLET_CAFE', 'BALLET CAFE')
      or upper(trim(coalesce(cc.nome, ''))) like '%CAFE%'
      or upper(trim(coalesce(cc.nome, ''))) like '%BALLET%CAFE%'
    )
  order by
    case
      when upper(trim(coalesce(cc.codigo, ''))) = 'CAFE' then 0
      when upper(trim(coalesce(cc.codigo, ''))) in ('BALLET_CAFE', 'BALLET CAFE') then 1
      else 2
    end,
    cc.id
  limit 1;

  if v_cafe_centro_id is null then
    raise notice 'Centro de custo do Ballet Cafe nao localizado. Seed de contexto do Cafe nao aplicada.';
    return;
  end if;

  select cm.id
    into v_maquininha_cafe_id
  from public.cartao_maquinas cm
  where coalesce(cm.ativo, true) = true
    and cm.centro_custo_id = v_cafe_centro_id
  order by cm.id
  limit 1;

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
    v_cafe_centro_id,
    seed.codigo,
    seed.descricao_exibicao,
    true,
    seed.ordem_exibicao,
    (
      select fpc.conta_financeira_id
      from public.formas_pagamento_contexto fpc
      where upper(trim(fpc.forma_pagamento_codigo)) = seed.codigo
        and fpc.conta_financeira_id is not null
      order by
        case when fpc.centro_custo_id = v_cafe_centro_id then 0 else 1 end,
        fpc.id
      limit 1
    ),
    case
      when seed.exige_maquininha then
        coalesce(
          (
            select fpc.cartao_maquina_id
            from public.formas_pagamento_contexto fpc
            where upper(trim(fpc.forma_pagamento_codigo)) = seed.codigo
              and fpc.cartao_maquina_id is not null
            order by
              case when fpc.centro_custo_id = v_cafe_centro_id then 0 else 1 end,
              fpc.id
            limit 1
          ),
          v_maquininha_cafe_id
        )
      else null
    end,
    seed.carteira_tipo,
    now(),
    now()
  from (
    values
      ('DINHEIRO', 'Dinheiro', 10, false, null),
      ('PIX', 'Pix', 20, false, null),
      ('CREDITO_AVISTA', 'Credito a vista', 30, true, null),
      ('DEBITO', 'Debito', 40, true, null),
      ('CREDIARIO', 'Crediario', 50, false, null),
      ('CONTA_INTERNA_ALUNO', 'Conta interna do aluno', 60, false, 'ALUNO'),
      ('CONTA_INTERNA_COLABORADOR', 'Conta interna do colaborador', 70, false, 'COLABORADOR')
  ) as seed(codigo, descricao_exibicao, ordem_exibicao, exige_maquininha, carteira_tipo)
  where not exists (
    select 1
    from public.formas_pagamento_contexto fpc
    where fpc.centro_custo_id = v_cafe_centro_id
      and upper(trim(fpc.forma_pagamento_codigo)) = seed.codigo
  );
end $$;

commit;
