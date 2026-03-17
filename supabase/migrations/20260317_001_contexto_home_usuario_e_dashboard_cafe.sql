-- 1. Preferencias de contexto por usuario
create table if not exists public.usuario_contexto_preferencias (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contexto text not null,
  rota_principal text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contexto)
);

create index if not exists idx_usuario_contexto_preferencias_user_id
on public.usuario_contexto_preferencias (user_id);

create index if not exists idx_usuario_contexto_preferencias_contexto
on public.usuario_contexto_preferencias (contexto);

drop trigger if exists set_usuario_contexto_preferencias_updated_at on public.usuario_contexto_preferencias;
create trigger set_usuario_contexto_preferencias_updated_at
before update on public.usuario_contexto_preferencias
for each row
execute function public.set_updated_at();

-- 2. Funcao utilitaria para classificar perfil de consumo do cafe
create or replace function public.fn_cafe_classificar_consumidor(
  p_cliente_pessoa_id bigint,
  p_consumidor_pessoa_id bigint
)
returns text
language plpgsql
stable
as $$
declare
  v_pessoa_id bigint;
  v_eh_colaborador boolean := false;
  v_eh_aluno boolean := false;
begin
  v_pessoa_id := coalesce(p_consumidor_pessoa_id, p_cliente_pessoa_id);

  if v_pessoa_id is null then
    return 'NAO_IDENTIFICADO';
  end if;

  select exists (
    select 1
    from public.colaboradores c
    where c.pessoa_id = v_pessoa_id
      and coalesce(c.ativo, true) = true
  ) into v_eh_colaborador;

  if v_eh_colaborador then
    return 'COLABORADOR';
  end if;

  select exists (
    select 1
    from public.pessoas_roles pr
    where pr.pessoa_id = v_pessoa_id
      and upper(pr.role) = 'ALUNO'
  ) into v_eh_aluno;

  if v_eh_aluno then
    return 'ALUNO';
  end if;

  return 'CLIENTE_EXTERNO';
end;
$$;

-- 3. View base analitica do cafe
drop view if exists public.vw_cafe_vendas_analytics;
create view public.vw_cafe_vendas_analytics as
select
  v.id as venda_id,
  v.created_at as venda_created_at,
  timezone('America/Fortaleza', v.created_at) as data_venda_referencia,
  coalesce(v.data_operacao, timezone('America/Fortaleza', v.created_at)::date) as dia_referencia,
  extract(hour from timezone('America/Fortaleza', v.created_at))::int as hora_referencia,
  v.pagador_pessoa_id as cliente_pessoa_id,
  v.consumidor_pessoa_id as beneficiario_pessoa_id,
  public.fn_cafe_classificar_consumidor(v.pagador_pessoa_id, v.consumidor_pessoa_id) as perfil_consumidor,
  i.produto_id,
  p.nome as produto_nome,
  p.categoria as produto_categoria,
  i.quantidade,
  coalesce(i.valor_unitario_centavos, i.preco_unitario_centavos, 0) as preco_unitario_centavos,
  coalesce(i.valor_total_centavos, i.total_centavos, 0) as total_centavos,
  v.forma_pagamento,
  v.status_pagamento
from public.cafe_vendas v
join public.cafe_venda_itens i on i.venda_id = v.id
left join public.cafe_produtos p on p.id = i.produto_id
where coalesce(v.status_pagamento, 'PAGO') <> 'CANCELADO';

-- 4. View de estoque/insumos com leitura para reposicao
drop view if exists public.vw_cafe_insumos_alertas;
create view public.vw_cafe_insumos_alertas as
select
  i.id as insumo_id,
  i.nome,
  i.unidade_base as unidade_medida,
  i.saldo_atual as estoque_atual,
  null::numeric as estoque_minimo,
  i.custo_unitario_estimado_centavos as custo_medio_centavos,
  case
    when coalesce(i.saldo_atual, 0) <= 0 then 'ZERADO'
    else 'SEM_PARAMETRO'
  end as status_reposicao
from public.cafe_insumos i
where coalesce(i.ativo, true) = true;

comment on table public.usuario_contexto_preferencias is
'Define, por usuario e por contexto, qual rota e a pagina principal ao trocar o contexto no seletor superior.';

comment on view public.vw_cafe_vendas_analytics is
'Base analitica do Ballet Cafe para dashboard: produto, horario, perfil de consumo, ticket e mix operacional. Usa data_operacao para o dia e created_at local para a faixa horaria no schema atual.';

comment on view public.vw_cafe_insumos_alertas is
'Leitura operacional dos insumos do Ballet Cafe para reposicao e acompanhamento de custo estimado.';
