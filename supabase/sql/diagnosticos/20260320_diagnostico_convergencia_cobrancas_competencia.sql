-- Objetivo:
-- Comparar a carteira canonica de cobrancas com a leitura exibida em cobrancas por competencia.
-- Nao executar UPDATE/DELETE.
-- Apenas SELECTs diagnosticos.

-- Query 1: carteira canonica por competencia e contexto
WITH carteira_base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.centro_custo_id,
    c.origem_tipo,
    c.origem_subtipo,
    c.status,
    c.valor_centavos,
    COALESCE(r.total_pago_centavos, 0) AS valor_pago_centavos,
    c.vencimento AS data_vencimento,
    CASE
      WHEN COALESCE(r.total_pago_centavos, 0) >= c.valor_centavos THEN 'PAGO'
      WHEN c.vencimento < CURRENT_DATE THEN 'VENCIDO'
      ELSE 'PENDENTE'
    END AS status_financeiro
  FROM public.cobrancas c
  LEFT JOIN (
    SELECT
      cobranca_id,
      SUM(valor_centavos) AS total_pago_centavos
    FROM public.recebimentos
    WHERE cobranca_id IS NOT NULL
    GROUP BY cobranca_id
  ) r ON r.cobranca_id = c.id
  WHERE c.competencia_ano_mes IS NOT NULL
    AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
)
SELECT
  competencia_ano_mes,
  centro_custo_id,
  COUNT(*) AS total_cobrancas,
  SUM(valor_centavos) AS total_previsto_centavos,
  SUM(COALESCE(valor_pago_centavos, 0)) AS total_pago_centavos,
  SUM(GREATEST(valor_centavos - COALESCE(valor_pago_centavos, 0), 0)) AS total_saldo_centavos
FROM carteira_base
GROUP BY competencia_ano_mes, centro_custo_id
ORDER BY competencia_ano_mes, centro_custo_id;

-- Query 2: marco/2026 detalhado para conferencia visual
SELECT
  c.id AS cobranca_id,
  p.nome AS pessoa_nome,
  c.competencia_ano_mes,
  c.origem_tipo,
  c.origem_subtipo,
  c.status,
  c.valor_centavos,
  COALESCE(r.total_pago_centavos, 0) AS valor_pago_centavos,
  c.vencimento AS data_vencimento,
  f.id AS fatura_id,
  f.cobranca_id AS fatura_cobranca_id,
  f.neofin_invoice_id
FROM public.cobrancas c
LEFT JOIN public.pessoas p ON p.id = c.pessoa_id
LEFT JOIN (
  SELECT
    cobranca_id,
    SUM(valor_centavos) AS total_pago_centavos
  FROM public.recebimentos
  WHERE cobranca_id IS NOT NULL
  GROUP BY cobranca_id
) r ON r.cobranca_id = c.id
LEFT JOIN public.credito_conexao_lancamentos l ON l.cobranca_id = c.id
LEFT JOIN public.credito_conexao_fatura_lancamentos fl ON fl.lancamento_id = l.id
LEFT JOIN public.credito_conexao_faturas f ON f.id = fl.fatura_id
WHERE c.competencia_ano_mes = '2026-03'
  AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
ORDER BY p.nome, c.id;
