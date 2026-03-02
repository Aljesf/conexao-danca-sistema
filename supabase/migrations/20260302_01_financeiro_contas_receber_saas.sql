BEGIN;

-- ====================================================
-- View 1: vw_financeiro_contas_receber_flat
-- Compatibilidade:
-- - cobrancas.valor_total_centavos OU cobrancas.valor_centavos
-- - cobrancas.data_vencimento OU cobrancas.vencimento
-- - recebimentos.valor_centavos OU recebimentos.valor_pago_centavos
-- ====================================================

CREATE OR REPLACE VIEW public.vw_financeiro_contas_receber_flat AS
WITH cobr AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    COALESCE(
      NULLIF(to_jsonb(c)->>'data_vencimento', '')::date,
      NULLIF(to_jsonb(c)->>'vencimento', '')::date
    ) AS data_vencimento,
    COALESCE(NULLIF(to_jsonb(c)->>'status', ''), '')::text AS status_cobranca,
    NULLIF(to_jsonb(c)->>'origem_tipo', '')::text AS origem_tipo,
    NULLIF(to_jsonb(c)->>'origem_id', '')::bigint AS origem_id,
    NULLIF(to_jsonb(c)->>'created_at', '')::timestamptz AS created_at,
    COALESCE(
      NULLIF(to_jsonb(c)->>'valor_total_centavos', '')::bigint,
      NULLIF(to_jsonb(c)->>'valor_centavos', '')::bigint,
      0
    )::bigint AS valor_total_centavos,
    COALESCE(
      NULLIF(to_jsonb(c)->>'competencia_ano_mes', ''),
      to_char(
        COALESCE(
          NULLIF(to_jsonb(c)->>'data_vencimento', '')::date,
          NULLIF(to_jsonb(c)->>'vencimento', '')::date,
          CURRENT_DATE
        ),
        'YYYY-MM'
      )
    )::text AS competencia_ano_mes
  FROM public.cobrancas c
  LEFT JOIN public.pessoas p ON p.id = c.pessoa_id
),
receb AS (
  SELECT
    NULLIF(to_jsonb(r)->>'cobranca_id', '')::bigint AS cobranca_id,
    COALESCE(
      SUM(
        CASE
          WHEN UPPER(COALESCE(NULLIF(to_jsonb(r)->>'status', ''), '')) IN ('CONFIRMADO', 'RECEBIDO', 'PAGO')
          THEN COALESCE(
            NULLIF(to_jsonb(r)->>'valor_centavos', '')::bigint,
            NULLIF(to_jsonb(r)->>'valor_pago_centavos', '')::bigint,
            0
          )
          ELSE 0
        END
      ),
      0
    )::bigint AS valor_recebido_centavos
  FROM public.recebimentos r
  WHERE NULLIF(to_jsonb(r)->>'cobranca_id', '') IS NOT NULL
  GROUP BY 1
)
SELECT
  c.cobranca_id,
  c.pessoa_id,
  c.pessoa_nome,
  c.data_vencimento,
  c.status_cobranca,
  c.origem_tipo,
  c.origem_id,
  c.created_at,
  c.valor_total_centavos::int AS valor_total_centavos,
  COALESCE(rec.valor_recebido_centavos, 0)::int AS valor_recebido_centavos,
  GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0)::int AS saldo_aberto_centavos,
  c.competencia_ano_mes,
  CASE
    WHEN c.data_vencimento IS NOT NULL
      AND c.data_vencimento < CURRENT_DATE
      AND GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0) > 0
    THEN (CURRENT_DATE - c.data_vencimento)
    ELSE 0
  END::int AS dias_atraso,
  CASE
    WHEN c.data_vencimento IS NULL THEN 'SEM_VENCIMENTO'
    WHEN c.data_vencimento < CURRENT_DATE
      AND GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0) > 0
    THEN 'VENCIDA'
    WHEN c.data_vencimento >= CURRENT_DATE
      AND c.data_vencimento <= (CURRENT_DATE + 7)
      AND GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0) > 0
    THEN 'A_VENCER_7'
    WHEN c.data_vencimento > (CURRENT_DATE + 7)
      AND c.data_vencimento <= (CURRENT_DATE + 30)
      AND GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0) > 0
    THEN 'A_VENCER_30'
    WHEN c.data_vencimento > (CURRENT_DATE + 30)
      AND GREATEST(c.valor_total_centavos - COALESCE(rec.valor_recebido_centavos, 0), 0) > 0
    THEN 'FUTURA'
    ELSE 'QUITADA_OU_ZERO'
  END::text AS bucket_vencimento
FROM cobr c
LEFT JOIN receb rec ON rec.cobranca_id = c.cobranca_id;

COMMENT ON VIEW public.vw_financeiro_contas_receber_flat IS
'View SaaS para Contas a Receber: saldo aberto, bucket de vencimento, competência e atraso.';

-- ====================================================
-- View 2: vw_financeiro_devedores_atrasados
-- ====================================================

CREATE OR REPLACE VIEW public.vw_financeiro_devedores_atrasados AS
SELECT
  f.pessoa_id,
  COUNT(*)::int AS titulos_vencidos_qtd,
  SUM(f.saldo_aberto_centavos)::int AS total_vencido_centavos,
  MIN(f.data_vencimento) AS vencimento_mais_antigo,
  MAX(f.dias_atraso)::int AS maior_dias_atraso
FROM public.vw_financeiro_contas_receber_flat f
WHERE f.bucket_vencimento = 'VENCIDA'
  AND f.saldo_aberto_centavos > 0
GROUP BY f.pessoa_id;

COMMENT ON VIEW public.vw_financeiro_devedores_atrasados IS
'Agregado SaaS: principais devedores com títulos vencidos (saldo aberto).';

COMMIT;
