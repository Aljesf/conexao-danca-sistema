-- A1: Criar conta financeira do FIN e preencher centro_custo_intermediacao_id

-- 1. Criar conta financeira do FIN (tipo VIRTUAL)
insert into public.contas_financeiras (nome, tipo, centro_custo_id, ativo, created_at, updated_at)
select
  'Conta Intermediação Financeira (FIN)',
  'VIRTUAL',
  cc.id,
  true,
  now(),
  now()
from public.centros_custo cc
where upper(trim(coalesce(cc.codigo, ''))) = 'FIN'
  and coalesce(cc.ativo, true) = true
order by cc.id
limit 1
on conflict do nothing;

-- 2. Preencher centro_custo_intermediacao_id para todas as contas ativas
update public.credito_conexao_contas
set centro_custo_intermediacao_id = (
  select cc.id
  from public.centros_custo cc
  where upper(trim(coalesce(cc.codigo, ''))) = 'FIN'
    and coalesce(cc.ativo, true) = true
  order by cc.id
  limit 1
)
where centro_custo_intermediacao_id is null
  and coalesce(ativo, true) = true;
