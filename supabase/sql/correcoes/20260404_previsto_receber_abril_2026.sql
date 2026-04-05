-- Saneamento do relatorio "Previsto para Receber" - abril/2026
-- Data de registro: 2026-04-04
-- Observacao:
-- - o lote principal abaixo ja foi aplicado
-- - Halanna e Kamilla tambem foram regularizadas localmente no mesmo dia
-- - permanece apenas uma ressalva operacional: billing NeoFin 38094818716008 ainda esta pending no provedor

BEGIN;

-- 1. Backfill de lancamentos vinculados a faturas finalizadas.
WITH alvo_lancamentos AS (
  SELECT DISTINCT ccl.id
  FROM public.credito_conexao_lancamentos ccl
  JOIN public.credito_conexao_fatura_lancamentos ccfl ON ccfl.lancamento_id = ccl.id
  JOIN public.credito_conexao_faturas ccf ON ccf.id = ccfl.fatura_id
  WHERE ccl.status = 'PENDENTE_FATURA'
    AND ccf.status IN ('FECHADA', 'EM_ATRASO', 'PAGA', 'CONCLUIDA')
)
UPDATE public.credito_conexao_lancamentos ccl
SET status = 'FATURADO',
    updated_at = now()
WHERE ccl.id IN (SELECT id FROM alvo_lancamentos);

-- 2. Limpeza do unico vinculo remanescente em fatura cancelada.
DELETE FROM public.credito_conexao_fatura_lancamentos
WHERE fatura_id = 4
  AND lancamento_id = 627;

UPDATE public.credito_conexao_faturas
SET valor_total_centavos = 0,
    updated_at = now()
WHERE id = 4;

-- 3. Cancelamento seguro de cobrancas legadas de matricula ja substituidas
-- por cobranca canonica de fatura ativa no mesmo titular/periodo.
WITH alvo_cobrancas_legadas AS (
  SELECT c_mat.id
  FROM public.cobrancas c_mat
  JOIN public.credito_conexao_contas ccc ON ccc.pessoa_titular_id = c_mat.pessoa_id
  JOIN public.credito_conexao_faturas ccf ON ccf.conta_conexao_id = ccc.id
    AND ccf.periodo_referencia = c_mat.competencia_ano_mes
  JOIN public.cobrancas c_fat ON c_fat.id = ccf.cobranca_id
    AND c_fat.status NOT IN ('CANCELADA', 'CANCELADO')
  LEFT JOIN public.recebimentos r_mat ON r_mat.cobranca_id = c_mat.id
  WHERE c_mat.origem_tipo = 'MATRICULA'
    AND c_mat.origem_subtipo = 'CARTAO_CONEXAO'
    AND c_mat.competencia_ano_mes = '2026-04'
    AND c_mat.status = 'PENDENTE'
  GROUP BY c_mat.id
  HAVING COUNT(r_mat.id) = 0
)
UPDATE public.cobrancas c
SET status = 'CANCELADA',
    cancelada_em = now(),
    cancelada_motivo = 'Cancelada por duplicidade com cobranca canonica de fatura. Correcao 2026-04-04.',
    cancelamento_motivo = 'Cancelada por duplicidade com cobranca canonica de fatura. Correcao 2026-04-04.',
    cancelamento_tipo = 'CORRECAO_DADOS',
    observacoes = COALESCE(c.observacoes || ' | ', '') || 'Cancelada por duplicidade com cobranca canonica de fatura. Correcao 2026-04-04.',
    updated_at = now()
WHERE c.id IN (SELECT id FROM alvo_cobrancas_legadas);

COMMIT;

-- 4. Halanna Denise de Oliveira Demetrio
-- A geracao da cobranca canonica foi feita pela rota/manual helper da fatura 64.
-- Resultado obtido: cobranca canonica 712.

UPDATE public.credito_conexao_lancamentos
SET cobranca_id = 712,
    updated_at = now()
WHERE id = 59;

UPDATE public.cobrancas
SET status = 'CANCELADA',
    cancelada_em = now(),
    cancelamento_tipo = 'CANCELAMENTO_POR_AJUSTE_SISTEMA',
    cancelamento_motivo = 'Cancelada apos geracao da cobranca canonica da fatura 64. Correcao manual 2026-04-04.',
    cancelada_motivo = 'Cancelada apos geracao da cobranca canonica da fatura 64. Correcao manual 2026-04-04.',
    observacoes = 'Cancelada apos geracao da cobranca canonica da fatura 64. Correcao manual 2026-04-04.',
    updated_at = now()
WHERE id = 63;

-- 5. Kamilla Melo Faro
-- Migracao local do recebimento legado para a cobranca canonica da fatura.

BEGIN;

UPDATE public.recebimentos
SET cobranca_id = 703,
    observacoes = 'Migracao manual do recebimento legado #110 para a cobranca canonica #703 em 2026-04-04.'
WHERE id = 110;

UPDATE public.movimento_financeiro
SET origem_id = '703',
    descricao = 'Mensalidade Conexao Danca - 2026-04 - Fatura #136',
    data_movimento = '2026-03-30T00:00:00'::timestamp,
    centro_custo_id = 1
WHERE id = 83;

UPDATE public.cobrancas
SET status = 'PAGO',
    data_pagamento = '2026-03-30T00:00:00'::timestamp,
    metodo_pagamento = 'PIX',
    observacoes = 'Migracao manual do recebimento legado #110 para a cobranca canonica #703 em 2026-04-04. Billing NeoFin 38094818716008 permanece pendente no provedor e requer conciliacao manual.',
    updated_at = now()
WHERE id = 703;

UPDATE public.credito_conexao_faturas
SET status = 'PAGA',
    updated_at = now()
WHERE id = 136;

UPDATE public.credito_conexao_lancamentos
SET status = 'PAGO',
    cobranca_id = 703,
    updated_at = now()
WHERE id = 136;

UPDATE public.cobrancas
SET status = 'CANCELADA',
    data_pagamento = NULL,
    metodo_pagamento = NULL,
    cancelada_em = now(),
    cancelamento_tipo = 'CANCELAMENTO_POR_AJUSTE_SISTEMA',
    cancelamento_motivo = 'Cancelada apos migracao do recebimento para a cobranca canonica #703. Migracao manual do recebimento legado #110 para a cobranca canonica #703 em 2026-04-04.',
    cancelada_motivo = 'Cancelada apos migracao do recebimento para a cobranca canonica #703. Migracao manual do recebimento legado #110 para a cobranca canonica #703 em 2026-04-04.',
    observacoes = 'Cancelada apos migracao do recebimento para a cobranca canonica #703. Migracao manual do recebimento legado #110 para a cobranca canonica #703 em 2026-04-04.',
    updated_at = now()
WHERE id = 140;

COMMIT;

-- Verificacao final

-- V1
SELECT COUNT(*) AS inconsistencias_lancamentos
FROM public.credito_conexao_lancamentos ccl
JOIN public.credito_conexao_fatura_lancamentos ccfl ON ccfl.lancamento_id = ccl.id
JOIN public.credito_conexao_faturas ccf ON ccf.id = ccfl.fatura_id
WHERE ccl.status = 'PENDENTE_FATURA'
  AND ccf.status <> 'ABERTA';

-- Duplicidade canonica por fatura/periodo
SELECT COUNT(*) AS duplicidades_canonicas
FROM (
  SELECT c.pessoa_id, ccf.periodo_referencia
  FROM public.cobrancas c
  JOIN public.credito_conexao_faturas ccf ON ccf.cobranca_id = c.id
  WHERE c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
    AND c.status NOT IN ('CANCELADA', 'CANCELADO')
  GROUP BY c.pessoa_id, ccf.periodo_referencia
  HAVING COUNT(*) > 1
) sub;

-- Halanna
SELECT c.id, c.status, ccf.id AS fatura_id, ccf.cobranca_id AS cobranca_fatura_id
FROM public.cobrancas c
LEFT JOIN public.credito_conexao_faturas ccf ON ccf.id = 64
WHERE c.id IN (63, 712)
ORDER BY c.id;

SELECT id, status, cobranca_id
FROM public.credito_conexao_lancamentos
WHERE id = 59;

-- Kamilla
SELECT c.id, c.status, c.data_pagamento, c.neofin_charge_id
FROM public.cobrancas c
WHERE c.id IN (140, 703)
ORDER BY c.id;

SELECT id, status, cobranca_id
FROM public.credito_conexao_lancamentos
WHERE id = 136;

SELECT id, status, cobranca_id
FROM public.credito_conexao_faturas
WHERE id = 136;

SELECT id, cobranca_id, valor_centavos, data_pagamento, metodo_pagamento
FROM public.recebimentos
WHERE id = 110;

SELECT id, origem, origem_id, valor_centavos, descricao
FROM public.movimento_financeiro
WHERE id = 83;

-- NeoFin
-- Billing remoto 38094818716008 ainda esta pending.
-- Consulta remota confirmou integration_identifier = fatura-credito-conexao-136.
-- Acao manual sugerida:
-- PUT https://api.neofin.services/billing/cancel/fatura-credito-conexao-136
