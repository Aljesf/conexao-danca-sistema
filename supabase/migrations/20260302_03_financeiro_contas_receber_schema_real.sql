BEGIN;

DROP VIEW IF EXISTS public.vw_financeiro_devedores_atrasados;
DROP VIEW IF EXISTS public.vw_financeiro_contas_receber_flat;

CREATE VIEW public.vw_financeiro_contas_receber_flat (
  cobranca_id,
  pessoa_id,
  vencimento,
  status_cobranca,
  origem_tipo,
  origem_id,
  created_at,
  valor_centavos,
  valor_recebido_centavos,
  saldo_aberto_centavos,
  competencia_ano_mes,
  dias_atraso,
  situacao_saas,
  bucket_vencimento
) AS
WITH receb AS (
  SELECT
    r.cobranca_id,
    COALESCE(SUM(r.valor_centavos), 0) AS valor_recebido_centavos
  FROM public.recebimentos r
  GROUP BY r.cobranca_id
),
base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.vencimento,
    c.status AS status_cobranca,
    c.origem_tipo,
    c.origem_id,
    c.created_at,
    COALESCE(c.valor_centavos, 0) AS valor_centavos,
    COALESCE(rec.valor_recebido_centavos, 0) AS valor_recebido_centavos,
    GREATEST(COALESCE(c.valor_centavos, 0) - COALESCE(rec.valor_recebido_centavos, 0), 0) AS saldo_aberto_centavos
  FROM public.cobrancas c
  LEFT JOIN receb rec ON rec.cobranca_id = c.id
)
SELECT
  b.cobranca_id,
  b.pessoa_id,
  b.vencimento,
  b.status_cobranca,
  b.origem_tipo,
  b.origem_id,
  b.created_at,
  b.valor_centavos,
  b.valor_recebido_centavos,
  b.saldo_aberto_centavos,
  to_char(COALESCE(b.vencimento, CURRENT_DATE), 'YYYY-MM') AS competencia_ano_mes,
  CASE
    WHEN b.vencimento IS NOT NULL
      AND b.vencimento < CURRENT_DATE
      AND b.saldo_aberto_centavos > 0
    THEN (CURRENT_DATE - b.vencimento)
    ELSE 0
  END::int AS dias_atraso,
  CASE
    WHEN b.saldo_aberto_centavos = 0 THEN 'QUITADA'
    WHEN b.vencimento IS NOT NULL AND b.vencimento < CURRENT_DATE THEN 'VENCIDA'
    ELSE 'EM_ABERTO'
  END::text AS situacao_saas,
  CASE
    WHEN b.vencimento IS NULL THEN 'SEM_VENCIMENTO'
    WHEN b.vencimento < CURRENT_DATE AND b.saldo_aberto_centavos > 0 THEN 'VENCIDA'
    WHEN b.vencimento >= CURRENT_DATE AND b.vencimento <= (CURRENT_DATE + 7) AND b.saldo_aberto_centavos > 0 THEN 'A_VENCER_7'
    WHEN b.vencimento > (CURRENT_DATE + 7) AND b.vencimento <= (CURRENT_DATE + 30) AND b.saldo_aberto_centavos > 0 THEN 'A_VENCER_30'
    WHEN b.vencimento > (CURRENT_DATE + 30) AND b.saldo_aberto_centavos > 0 THEN 'FUTURA'
    ELSE 'QUITADA_OU_ZERO'
  END::text AS bucket_vencimento
FROM base b;

COMMENT ON VIEW public.vw_financeiro_contas_receber_flat IS
'View SaaS canonica (schema real): saldo_aberto + vencimento -> situacao_saas/bucket.';

CREATE VIEW public.vw_financeiro_devedores_atrasados AS
SELECT
  f.pessoa_id,
  COUNT(*)::int AS titulos_vencidos_qtd,
  SUM(f.saldo_aberto_centavos)::int AS total_vencido_centavos,
  MIN(f.vencimento) AS vencimento_mais_antigo,
  MAX(f.dias_atraso)::int AS maior_dias_atraso
FROM public.vw_financeiro_contas_receber_flat f
WHERE f.situacao_saas = 'VENCIDA'
  AND f.saldo_aberto_centavos > 0
  AND upper(coalesce(f.status_cobranca,'')) <> 'CANCELADA'
GROUP BY f.pessoa_id;

COMMENT ON VIEW public.vw_financeiro_devedores_atrasados IS
'Top devedores atrasados (SaaS): VENCIDA com saldo aberto, exclui CANCELADA.';

COMMIT;
