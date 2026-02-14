begin;

-- Sincroniza o desconto na folha quando a fatura do Cartao Conexao (COLABORADOR) mudar.
-- Regra:
-- - So faz sentido quando credito_conexao_faturas.folha_pagamento_id IS NOT NULL
-- - E quando a conta e tipo_conta='COLABORADOR'
-- - Mantem idempotencia por (folha_id, colaborador_id, referencia_tipo, referencia_id)

create or replace function public.sync_credito_fatura_para_folha(p_fatura_id bigint)
returns void language plpgsql as $$
declare
  v_folha_id bigint;
  v_conta_id bigint;
  v_valor int;
  v_tipo_conta text;
  v_pessoa_id bigint;
  v_colaborador_id bigint;
begin
  select f.folha_pagamento_id, f.conta_conexao_id, f.valor_total_centavos
    into v_folha_id, v_conta_id, v_valor
  from public.credito_conexao_faturas f
  where f.id = p_fatura_id;

  if v_folha_id is null then
    return;
  end if;

  select c.tipo_conta, c.pessoa_titular_id
    into v_tipo_conta, v_pessoa_id
  from public.credito_conexao_contas c
  where c.id = v_conta_id;

  if v_tipo_conta is distinct from 'COLABORADOR' then
    return;
  end if;

  select col.id
    into v_colaborador_id
  from public.colaboradores col
  where col.pessoa_id = v_pessoa_id
  limit 1;

  if v_colaborador_id is null then
    return;
  end if;

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
  values (
    v_folha_id,
    v_colaborador_id,
    'DESCONTO_CREDITO_CONEXAO',
    'Desconto Cartao Conexao (fatura #' || p_fatura_id || ')',
    coalesce(v_valor, 0),
    'CREDITO_CONEXAO_FATURA',
    p_fatura_id,
    true
  )
  on conflict (folha_id, colaborador_id, referencia_tipo, referencia_id)
  do update set
    valor_centavos = excluded.valor_centavos,
    descricao = excluded.descricao,
    tipo_item = excluded.tipo_item;
end;
$$;

-- Garantir idempotencia do ON CONFLICT.
-- Antes, remove duplicidades historicas para nao falhar ao criar indice unico.
delete from public.folha_pagamento_itens i
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by folha_id, colaborador_id, referencia_tipo, referencia_id
        order by id desc
      ) as rn
    from public.folha_pagamento_itens
    where referencia_tipo is not null
      and referencia_id is not null
  ) t
  where t.rn > 1
) d
where i.id = d.id;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_folha_itens_ref_por_colab'
  ) then
    execute 'create unique index ux_folha_itens_ref_por_colab
             on public.folha_pagamento_itens (folha_id, colaborador_id, referencia_tipo, referencia_id)';
  end if;
end $$;

create or replace function public.trg_sync_credito_fatura_para_folha()
returns trigger language plpgsql as $$
begin
  if new.folha_pagamento_id is not null then
    perform public.sync_credito_fatura_para_folha(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_credito_fatura_sync_folha on public.credito_conexao_faturas;
create trigger trg_credito_fatura_sync_folha
after insert or update of valor_total_centavos, folha_pagamento_id on public.credito_conexao_faturas
for each row execute function public.trg_sync_credito_fatura_para_folha();

commit;
