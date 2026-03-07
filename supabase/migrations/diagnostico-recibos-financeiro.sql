-- Diagnostico tecnico do dominio de recibos financeiros
-- Data: 2026-03-07
-- Objetivo:
-- 1) identificar a fonte real do evento de pagamento confirmado;
-- 2) mapear cobrancas, recebimentos, faturas e documentos relacionados;
-- 3) levantar amostras de quitacao parcial, quitacao total e leitura mensal;
-- 4) preparar o snapshot canonico do recibo sem alterar o schema.

-- ============================================================================
-- 1) Estrutura das tabelas base do financeiro
-- ============================================================================

select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'cobrancas',
    'recebimentos',
    'credito_conexao_faturas',
    'credito_conexao_contas',
    'financeiro_cobrancas_avulsas',
    'documentos_modelo',
    'documentos_emitidos'
  )
order by table_name, ordinal_position;

-- Objetivo: verificar se existe estrutura mensal explicita de pagamento
-- para conta interna. A rota atual de preview usa fallback porque esta
-- estrutura pode nao existir em todos os ambientes.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'conta_interna_pagamentos',
    'credito_conexao_faturas_cobrancas_avulsas'
  )
order by table_name, ordinal_position;

-- ============================================================================
-- 2) Relacoes reais entre cobranca, recebimento e pessoa
-- ============================================================================

select
  c.id as cobranca_id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  c.competencia_ano_mes,
  c.vencimento,
  c.valor_centavos as valor_total_referencia_centavos,
  c.status as status_cobranca,
  c.origem_tipo,
  c.origem_id,
  r.id as recebimento_id,
  r.valor_centavos as valor_pago_centavos,
  r.data_pagamento,
  r.metodo_pagamento,
  r.forma_pagamento_codigo,
  r.centro_custo_id,
  r.origem_sistema
from public.cobrancas c
left join public.pessoas p
  on p.id = c.pessoa_id
left join public.recebimentos r
  on r.cobranca_id = c.id
order by c.id desc, r.id desc
limit 50;

-- ============================================================================
-- 3) Eventos de pagamento confirmado por cobranca
-- Regra diagnostica:
-- - recebimento confirmado = recebimentos com data_pagamento preenchida
-- - esta e a ancora recomendada para o recibo principal
-- ============================================================================

with recebimentos_por_cobranca as (
  select
    r.cobranca_id,
    count(*) filter (where r.data_pagamento is not null) as recebimentos_confirmados_qtd,
    coalesce(sum(case when r.data_pagamento is not null then coalesce(r.valor_centavos, 0) else 0 end), 0)::bigint as total_pago_centavos,
    max(r.data_pagamento) filter (where r.data_pagamento is not null) as ultimo_pagamento_em
  from public.recebimentos r
  where r.cobranca_id is not null
  group by r.cobranca_id
)
select
  c.id as cobranca_id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  coalesce(nullif(btrim(c.competencia_ano_mes), ''), to_char(c.vencimento, 'YYYY-MM')) as competencia_ano_mes,
  c.valor_centavos as valor_total_referencia_centavos,
  coalesce(rpc.total_pago_centavos, 0) as valor_pago_centavos,
  greatest(coalesce(c.valor_centavos, 0) - coalesce(rpc.total_pago_centavos, 0), 0) as saldo_pos_pagamento_centavos,
  coalesce(rpc.recebimentos_confirmados_qtd, 0) as recebimentos_confirmados_qtd,
  rpc.ultimo_pagamento_em,
  c.status as status_cobranca,
  case
    when coalesce(rpc.total_pago_centavos, 0) = 0 then 'SEM_RECEBIMENTO_CONFIRMADO'
    when coalesce(rpc.total_pago_centavos, 0) < coalesce(c.valor_centavos, 0) then 'RECEBIMENTO_PARCIAL'
    else 'QUITACAO_TOTAL'
  end as granularidade_financeira
from public.cobrancas c
left join public.pessoas p
  on p.id = c.pessoa_id
left join recebimentos_por_cobranca rpc
  on rpc.cobranca_id = c.id
order by c.id desc
limit 50;

-- ============================================================================
-- 4) Amostras objetivas
-- ============================================================================

-- Cobrancas com quitacao total por soma de recebimentos
with recebimentos_por_cobranca as (
  select
    r.cobranca_id,
    coalesce(sum(case when r.data_pagamento is not null then coalesce(r.valor_centavos, 0) else 0 end), 0)::bigint as total_pago_centavos
  from public.recebimentos r
  where r.cobranca_id is not null
  group by r.cobranca_id
)
select
  c.id as cobranca_id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  c.valor_centavos,
  rpc.total_pago_centavos,
  c.status,
  c.data_pagamento,
  c.competencia_ano_mes,
  c.origem_tipo,
  c.origem_id
from public.cobrancas c
join recebimentos_por_cobranca rpc
  on rpc.cobranca_id = c.id
left join public.pessoas p
  on p.id = c.pessoa_id
where rpc.total_pago_centavos >= coalesce(c.valor_centavos, 0)
order by c.id desc
limit 20;

-- Cobrancas com recebimento parcial
with recebimentos_por_cobranca as (
  select
    r.cobranca_id,
    coalesce(sum(case when r.data_pagamento is not null then coalesce(r.valor_centavos, 0) else 0 end), 0)::bigint as total_pago_centavos
  from public.recebimentos r
  where r.cobranca_id is not null
  group by r.cobranca_id
)
select
  c.id as cobranca_id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  c.valor_centavos,
  rpc.total_pago_centavos,
  greatest(coalesce(c.valor_centavos, 0) - rpc.total_pago_centavos, 0) as saldo_aberto_centavos,
  c.status,
  c.competencia_ano_mes
from public.cobrancas c
join recebimentos_por_cobranca rpc
  on rpc.cobranca_id = c.id
left join public.pessoas p
  on p.id = c.pessoa_id
where rpc.total_pago_centavos > 0
  and rpc.total_pago_centavos < coalesce(c.valor_centavos, 0)
order by c.id desc
limit 20;

-- Recebimentos recentes: principal candidato a snapshot de recibo individual
select
  r.id as recebimento_id,
  r.cobranca_id,
  c.pessoa_id,
  p.nome as pessoa_nome,
  c.competencia_ano_mes,
  c.origem_tipo,
  c.origem_id,
  c.descricao,
  c.valor_centavos as valor_total_referencia_centavos,
  r.valor_centavos as valor_pago_centavos,
  r.data_pagamento,
  r.metodo_pagamento,
  r.forma_pagamento_codigo,
  r.centro_custo_id,
  r.origem_sistema,
  r.created_at
from public.recebimentos r
join public.cobrancas c
  on c.id = r.cobranca_id
left join public.pessoas p
  on p.id = c.pessoa_id
where r.data_pagamento is not null
order by r.id desc
limit 20;

-- ============================================================================
-- 5) Leitura mensal / conta interna
-- ============================================================================

select
  f.id as fatura_id,
  f.conta_conexao_id,
  cc.pessoa_titular_id as pessoa_id,
  p.nome as pessoa_nome,
  cc.tipo_conta as conta_interna_tipo,
  f.periodo_referencia as competencia_ano_mes,
  f.status as status_fatura,
  f.data_vencimento,
  f.valor_total_centavos,
  f.cobranca_id,
  f.neofin_invoice_id
from public.credito_conexao_faturas f
left join public.credito_conexao_contas cc
  on cc.id = f.conta_conexao_id
left join public.pessoas p
  on p.id = cc.pessoa_titular_id
order by f.id desc
limit 20;

-- Itens da conta interna por competencia: base potencial do recibo consolidado mensal
select
  fi.fatura_id,
  fi.conta_conexao_id,
  fi.pessoa_titular_id,
  fi.competencia_ano_mes,
  fi.valor_total_centavos,
  fi.lancamento_id,
  fi.descricao,
  fi.valor_centavos,
  fi.status_lancamento
from public.vw_credito_conexao_fatura_itens fi
order by fi.fatura_id desc, fi.lancamento_id desc
limit 50;

-- ============================================================================
-- 6) Estruturas de documentos ja existentes
-- ============================================================================

select
  id,
  titulo,
  versao,
  formato,
  tipo_documento_id,
  ativo,
  observacoes,
  updated_at
from public.documentos_modelo
where upper(coalesce(titulo, '')) like '%RECIBO%'
   or upper(coalesce(observacoes, '')) like '%RECIBO%'
order by id desc;

select
  id,
  matricula_id,
  contrato_modelo_id,
  status_assinatura,
  snapshot_financeiro_json,
  variaveis_utilizadas_json,
  created_at,
  updated_at
from public.documentos_emitidos
order by id desc
limit 20;

-- ============================================================================
-- 7) Relacao entre recibos emitidos, cobrancas e recebimentos
-- Observacao:
-- - hoje o snapshot financeiro fica serializado no payload da emissao;
-- - este select inspeciona emissoes recentes para validar o reaproveitamento.
-- ============================================================================

select
  de.id as documento_emitido_id,
  de.contrato_modelo_id,
  de.matricula_id,
  de.status_assinatura,
  de.snapshot_financeiro_json,
  de.variaveis_utilizadas_json,
  de.created_at,
  de.updated_at
from public.documentos_emitidos de
order by de.id desc
limit 20;
