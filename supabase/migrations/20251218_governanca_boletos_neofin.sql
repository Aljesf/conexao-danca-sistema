BEGIN;

-- 1) Indexes (non-breaking)
CREATE INDEX IF NOT EXISTS idx_cobrancas_neofin_charge_id
ON public.cobrancas (neofin_charge_id)
WHERE neofin_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cobrancas_status_vencimento
ON public.cobrancas (status, vencimento);

CREATE INDEX IF NOT EXISTS idx_cobrancas_created_at
ON public.cobrancas (created_at);

CREATE INDEX IF NOT EXISTS idx_recebimentos_cobranca_id
ON public.recebimentos (cobranca_id)
WHERE cobranca_id IS NOT NULL;

-- 2) View: NeoFin boletos with receivement aggregations
CREATE OR REPLACE VIEW public.vw_governanca_boletos_neofin AS
SELECT
  c.id AS cobranca_id,
  c.pessoa_id,
  p.nome AS pessoa_nome,
  c.centro_custo_id,
  cc.codigo AS centro_custo_codigo,
  cc.nome AS centro_custo_nome,
  c.descricao,
  c.valor_centavos,
  c.vencimento,
  c.status AS cobranca_status,
  c.neofin_charge_id,
  c.link_pagamento,
  c.linha_digitavel,
  c.neofin_payload,
  c.created_at AS cobranca_criada_em,
  c.updated_at AS cobranca_atualizada_em,
  COALESCE(SUM(r.valor_centavos), 0) AS total_recebido_centavos,
  MAX(r.data_pagamento) AS ultimo_pagamento_em
FROM public.cobrancas c
LEFT JOIN public.pessoas p
  ON p.id = c.pessoa_id
LEFT JOIN public.centros_custo cc
  ON cc.id = c.centro_custo_id
LEFT JOIN public.recebimentos r
  ON r.cobranca_id = c.id
WHERE c.neofin_charge_id IS NOT NULL
GROUP BY
  c.id,
  c.pessoa_id,
  p.nome,
  c.centro_custo_id,
  cc.codigo,
  cc.nome,
  c.descricao,
  c.valor_centavos,
  c.vencimento,
  c.status,
  c.neofin_charge_id,
  c.link_pagamento,
  c.linha_digitavel,
  c.neofin_payload,
  c.created_at,
  c.updated_at;

COMMIT;
