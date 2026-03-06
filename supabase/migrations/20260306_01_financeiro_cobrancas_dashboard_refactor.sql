BEGIN;

-- ============================================================================
-- Financeiro / Credito Conexao - refactor de cobrancas e dashboard mensal
-- Data: 2026-03-06
-- Objetivo:
-- - preservar o fluxo canonico de cobranca -> lancamento -> fatura
-- - reutilizar campos ja existentes para competencia e integracao NeoFin
-- - criar base operacional para agrupamento mensal, status e KPIs SaaS
-- - adicionar indices para a nova tela de cobrancas e dashboard mensal
-- ============================================================================

-- 1) Indices canonicos em cobrancas para filtros mensais e operacionais.
CREATE INDEX IF NOT EXISTS idx_cobrancas_competencia_ano_mes
  ON public.cobrancas (competencia_ano_mes)
  WHERE competencia_ano_mes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cobrancas_status
  ON public.cobrancas (status);

CREATE INDEX IF NOT EXISTS idx_cobrancas_pessoa_id
  ON public.cobrancas (pessoa_id);

CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento
  ON public.cobrancas (vencimento);

CREATE INDEX IF NOT EXISTS idx_cobrancas_neofin_charge_id_operacional
  ON public.cobrancas (neofin_charge_id)
  WHERE neofin_charge_id IS NOT NULL;

-- 2) Indices auxiliares em faturas do Credito Conexao.
-- Mantem compatibilidade com o legado: cobranca canonica continua sendo a de public.cobrancas.
CREATE INDEX IF NOT EXISTS idx_credito_conexao_faturas_periodo_referencia
  ON public.credito_conexao_faturas (periodo_referencia);

CREATE INDEX IF NOT EXISTS idx_credito_conexao_faturas_cobranca_id
  ON public.credito_conexao_faturas (cobranca_id)
  WHERE cobranca_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credito_conexao_faturas_data_vencimento
  ON public.credito_conexao_faturas (data_vencimento);

CREATE INDEX IF NOT EXISTS idx_credito_conexao_faturas_neofin_invoice_id
  ON public.credito_conexao_faturas (neofin_invoice_id)
  WHERE neofin_invoice_id IS NOT NULL;

-- 3) View operacional canonica.
-- Regras:
-- - competencia prefere cobrancas.competencia_ano_mes; fallback seguro para vencimento
-- - valor pago considera apenas recebimentos confirmados/recebidos/pagos
-- - nao duplica itens de fatura: a view e nivel cobranca
CREATE OR REPLACE VIEW public.vw_financeiro_cobrancas_operacionais AS
WITH recebimentos_confirmados AS (
  SELECT
    r.cobranca_id,
    COALESCE(
      SUM(
        CASE
          WHEN UPPER(COALESCE(r.status, '')) IN ('CONFIRMADO', 'RECEBIDO', 'PAGO')
            THEN COALESCE(r.valor_centavos, 0)
          ELSE 0
        END
      ),
      0
    )::int AS valor_pago_centavos,
    MAX(r.data_pagamento) FILTER (
      WHERE UPPER(COALESCE(r.status, '')) IN ('CONFIRMADO', 'RECEBIDO', 'PAGO')
    ) AS data_pagamento
  FROM public.recebimentos r
  WHERE r.cobranca_id IS NOT NULL
  GROUP BY r.cobranca_id
)
SELECT
  c.id AS cobranca_id,
  c.pessoa_id,
  p.nome AS pessoa_nome,
  COALESCE(
    NULLIF(BTRIM(c.competencia_ano_mes), ''),
    TO_CHAR(COALESCE(c.vencimento, CURRENT_DATE), 'YYYY-MM')
  )::text AS competencia_ano_mes,
  c.vencimento AS data_vencimento,
  c.status AS status_cobranca,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id,
  c.descricao,
  COALESCE(c.valor_centavos, 0)::int AS valor_centavos,
  COALESCE(rec.valor_pago_centavos, 0)::int AS valor_pago_centavos,
  GREATEST(COALESCE(c.valor_centavos, 0) - COALESCE(rec.valor_pago_centavos, 0), 0)::int AS saldo_aberto_centavos,
  CASE
    WHEN c.vencimento IS NOT NULL
      AND c.vencimento < CURRENT_DATE
      AND GREATEST(COALESCE(c.valor_centavos, 0) - COALESCE(rec.valor_pago_centavos, 0), 0) > 0
    THEN (CURRENT_DATE - c.vencimento)
    ELSE 0
  END::int AS dias_atraso,
  rec.data_pagamento,
  c.neofin_charge_id,
  c.link_pagamento,
  c.linha_digitavel,
  c.created_at,
  c.updated_at
FROM public.cobrancas c
LEFT JOIN public.pessoas p
  ON p.id = c.pessoa_id
LEFT JOIN recebimentos_confirmados rec
  ON rec.cobranca_id = c.id;

COMMENT ON VIEW public.vw_financeiro_cobrancas_operacionais IS
'Base operacional canonica para cobrancas: competencia, pessoa, saldo, atraso e integracao NeoFin sem duplicar itens de fatura.';

COMMIT;
