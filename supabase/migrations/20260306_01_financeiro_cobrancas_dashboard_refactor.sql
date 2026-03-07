BEGIN;

-- ============================================================================
-- Financeiro / Credito Conexao - refactor de cobrancas e dashboard mensal
-- Data: 2026-03-06
-- Objetivo:
-- - preservar o fluxo canonico de cobranca -> lancamento -> fatura
-- - ampliar a carteira operacional para mensalidades, avulsas e falhas NeoFin
-- - permitir leitura mensal SaaS sem depender de vinculacao NeoFin
-- - manter compatibilidade com a view ja consumida pela API e pelo dashboard
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

-- 2) Indices auxiliares em faturas e contas do Credito Conexao.
-- Mantem compatibilidade com o legado: cobranca canonica continua sendo a de
-- public.cobrancas, mas a carteira operacional pode sugerir e registrar
-- vinculos manuais para cobrancas avulsas.
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

CREATE INDEX IF NOT EXISTS idx_credito_conexao_contas_pessoa_tipo
  ON public.credito_conexao_contas (pessoa_titular_id, tipo_conta);

CREATE INDEX IF NOT EXISTS idx_financeiro_cobrancas_avulsas_pessoa_id
  ON public.financeiro_cobrancas_avulsas (pessoa_id);

CREATE INDEX IF NOT EXISTS idx_financeiro_cobrancas_avulsas_status
  ON public.financeiro_cobrancas_avulsas (status);

CREATE INDEX IF NOT EXISTS idx_financeiro_cobrancas_avulsas_vencimento
  ON public.financeiro_cobrancas_avulsas (vencimento);

-- 3) Estrutura minima e rastreavel para vinculo manual de cobrancas avulsas.
-- Nao altera o legado de credito_conexao_faturas.cobranca_id, que continua
-- reservado para public.cobrancas.
CREATE TABLE IF NOT EXISTS public.credito_conexao_faturas_cobrancas_avulsas (
  id bigserial PRIMARY KEY,
  fatura_id bigint NOT NULL REFERENCES public.credito_conexao_faturas(id) ON DELETE CASCADE,
  cobranca_avulsa_id bigint NOT NULL REFERENCES public.financeiro_cobrancas_avulsas(id) ON DELETE CASCADE,
  confirmado_competencia_diferente boolean NOT NULL DEFAULT false,
  criado_por_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_credito_conexao_faturas_cobrancas_avulsas_cobranca
  ON public.credito_conexao_faturas_cobrancas_avulsas (cobranca_avulsa_id);

CREATE INDEX IF NOT EXISTS idx_credito_conexao_faturas_cobrancas_avulsas_fatura
  ON public.credito_conexao_faturas_cobrancas_avulsas (fatura_id);

COMMENT ON TABLE public.credito_conexao_faturas_cobrancas_avulsas IS
'Vinculo manual rastreavel entre faturas do Credito Conexao e cobrancas avulsas.';

-- 4) View operacional canonica.
-- Regras:
-- - preserva os 20 campos antigos da view na mesma ordem para compatibilidade
-- - inclui mensalidades, cobrancas avulsas e situacao de integracao NeoFin
-- - NeoFin e camada operacional; a cobranca continua existindo sem NeoFin
-- - fatura_id representa vinculo efetivo, nao mera sugestao de mesma competencia
CREATE OR REPLACE VIEW public.vw_financeiro_cobrancas_operacionais AS
WITH recebimentos_confirmados AS (
  SELECT
    r.cobranca_id,
    COALESCE(
      SUM(
        CASE
          WHEN r.data_pagamento IS NOT NULL
            THEN COALESCE(r.valor_centavos, 0)
          ELSE 0
        END
      ),
      0
    )::int AS valor_pago_centavos,
    MAX(r.data_pagamento) FILTER (
      WHERE r.data_pagamento IS NOT NULL
    ) AS data_pagamento
  FROM public.recebimentos r
  WHERE r.cobranca_id IS NOT NULL
  GROUP BY r.cobranca_id
),
contas_conexao_priorizadas AS (
  SELECT
    cc.id AS conta_conexao_id,
    cc.pessoa_titular_id,
    cc.tipo_conta,
    cc.descricao_exibicao,
    ROW_NUMBER() OVER (
      PARTITION BY cc.pessoa_titular_id
      ORDER BY
        CASE WHEN COALESCE(cc.ativo, true) THEN 0 ELSE 1 END,
        CASE UPPER(COALESCE(cc.tipo_conta, ''))
          WHEN 'ALUNO' THEN 0
          WHEN 'COLABORADOR' THEN 1
          ELSE 9
        END,
        cc.id DESC
    ) AS rn
  FROM public.credito_conexao_contas cc
  WHERE cc.pessoa_titular_id IS NOT NULL
),
contas_conexao_por_pessoa AS (
  SELECT
    conta_conexao_id,
    pessoa_titular_id,
    tipo_conta,
    descricao_exibicao
  FROM contas_conexao_priorizadas
  WHERE rn = 1
),
faturas_base AS (
  SELECT
    f.id AS fatura_id,
    f.conta_conexao_id,
    f.periodo_referencia,
    f.status AS fatura_status,
    f.data_vencimento AS fatura_data_vencimento,
    COALESCE(f.valor_total_centavos, 0)::int AS fatura_valor_total_centavos,
    f.cobranca_id,
    f.neofin_invoice_id,
    conta.pessoa_titular_id AS pessoa_id,
    conta.tipo_conta,
    conta.descricao_exibicao AS conta_label
  FROM public.credito_conexao_faturas f
  LEFT JOIN public.credito_conexao_contas conta
    ON conta.id = f.conta_conexao_id
),
faturas_por_cobranca_direta AS (
  SELECT
    fb.*,
    ROW_NUMBER() OVER (
      PARTITION BY fb.cobranca_id
      ORDER BY fb.fatura_id DESC
    ) AS rn
  FROM faturas_base fb
  WHERE fb.cobranca_id IS NOT NULL
),
faturas_por_origem AS (
  SELECT
    c.id AS cobranca_id,
    fb.fatura_id,
    fb.conta_conexao_id,
    fb.periodo_referencia,
    fb.fatura_status,
    fb.fatura_data_vencimento,
    fb.fatura_valor_total_centavos,
    fb.cobranca_id AS fatura_cobranca_id,
    fb.neofin_invoice_id,
    fb.pessoa_id,
    fb.tipo_conta,
    fb.conta_label,
    ROW_NUMBER() OVER (
      PARTITION BY c.id
      ORDER BY fb.fatura_id DESC
    ) AS rn
  FROM public.cobrancas c
  JOIN faturas_base fb
    ON UPPER(COALESCE(c.origem_tipo, '')) IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
   AND fb.fatura_id = c.origem_id
),
avulsas_vinculadas AS (
  SELECT
    vinc.cobranca_avulsa_id,
    fb.fatura_id,
    fb.conta_conexao_id,
    fb.periodo_referencia,
    fb.fatura_status,
    fb.fatura_data_vencimento,
    fb.neofin_invoice_id,
    fb.pessoa_id,
    fb.tipo_conta,
    fb.conta_label,
    vinc.confirmado_competencia_diferente,
    vinc.created_at AS vinculo_created_at,
    vinc.updated_at AS vinculo_updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY vinc.cobranca_avulsa_id
      ORDER BY vinc.updated_at DESC, vinc.id DESC
    ) AS rn
  FROM public.credito_conexao_faturas_cobrancas_avulsas vinc
  JOIN faturas_base fb
    ON fb.fatura_id = vinc.fatura_id
),
cobrancas_base AS (
  SELECT
    c.id AS cobranca_id,
    'COBRANCA'::text AS cobranca_fonte,
    c.id AS cobranca_origem_id,
    COALESCE(c.pessoa_id, fatura_direta.pessoa_id, fatura_origem.pessoa_id) AS pessoa_id,
    COALESCE(p.nome, pessoa_fatura.nome) AS pessoa_nome,
    COALESCE(
      NULLIF(BTRIM(c.competencia_ano_mes), ''),
      fatura_direta.periodo_referencia,
      fatura_origem.periodo_referencia,
      TO_CHAR(COALESCE(c.vencimento::date, CURRENT_DATE), 'YYYY-MM')
    )::text AS competencia_ano_mes,
    c.vencimento::date AS data_vencimento,
    c.status AS status_bruto,
    c.status AS status_cobranca,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.descricao,
    CASE
      WHEN UPPER(COALESCE(c.origem_tipo, '')) IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
        THEN 'MENSALIDADE'
      WHEN UPPER(COALESCE(c.origem_tipo, '')) = 'MATRICULA'
       AND UPPER(COALESCE(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
        THEN 'MENSALIDADE'
      WHEN UPPER(COALESCE(c.origem_subtipo, '')) = 'CARTAO_CONEXAO'
        THEN 'AVULSA'
      ELSE 'OUTRA'
    END AS tipo_cobranca,
    COALESCE(c.valor_centavos, 0)::int AS valor_centavos,
    COALESCE(rec.valor_pago_centavos, 0)::int AS valor_pago_centavos,
    GREATEST(COALESCE(c.valor_centavos, 0) - COALESCE(rec.valor_pago_centavos, 0), 0)::int AS saldo_centavos,
    rec.data_pagamento,
    CASE
      WHEN c.vencimento IS NOT NULL
       AND c.vencimento::date < CURRENT_DATE
       AND GREATEST(COALESCE(c.valor_centavos, 0) - COALESCE(rec.valor_pago_centavos, 0), 0) > 0
        THEN (CURRENT_DATE - c.vencimento::date)
      ELSE 0
    END::int AS dias_atraso,
    COALESCE(fatura_direta.fatura_id, fatura_origem.fatura_id) AS fatura_id,
    COALESCE(fatura_direta.periodo_referencia, fatura_origem.periodo_referencia) AS fatura_competencia,
    COALESCE(fatura_direta.fatura_status, fatura_origem.fatura_status) AS fatura_status,
    COALESCE(fatura_direta.conta_conexao_id, fatura_origem.conta_conexao_id, conta_pessoa.conta_conexao_id) AS conta_conexao_id,
    COALESCE(fatura_direta.tipo_conta, fatura_origem.tipo_conta, conta_pessoa.tipo_conta) AS tipo_conta,
    c.neofin_charge_id,
    COALESCE(fatura_direta.neofin_invoice_id, fatura_origem.neofin_invoice_id) AS neofin_invoice_id,
    c.link_pagamento,
    c.linha_digitavel,
    c.created_at,
    c.updated_at
  FROM public.cobrancas c
  LEFT JOIN recebimentos_confirmados rec
    ON rec.cobranca_id = c.id
  LEFT JOIN faturas_por_cobranca_direta fatura_direta
    ON fatura_direta.cobranca_id = c.id
   AND fatura_direta.rn = 1
  LEFT JOIN faturas_por_origem fatura_origem
    ON fatura_origem.cobranca_id = c.id
   AND fatura_origem.rn = 1
  LEFT JOIN contas_conexao_por_pessoa conta_pessoa
    ON conta_pessoa.pessoa_titular_id = c.pessoa_id
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  LEFT JOIN public.pessoas pessoa_fatura
    ON pessoa_fatura.id = COALESCE(fatura_direta.pessoa_id, fatura_origem.pessoa_id)
),
avulsas_base AS (
  SELECT
    av.id AS cobranca_id,
    'COBRANCA_AVULSA'::text AS cobranca_fonte,
    av.id AS cobranca_origem_id,
    av.pessoa_id,
    pagador.nome AS pessoa_nome,
    TO_CHAR(COALESCE(av.vencimento, CURRENT_DATE), 'YYYY-MM')::text AS competencia_ano_mes,
    av.vencimento::date AS data_vencimento,
    av.status AS status_bruto,
    av.status AS status_cobranca,
    av.origem_tipo,
    NULL::text AS origem_subtipo,
    av.origem_id,
    COALESCE(
      NULLIF(BTRIM(av.observacao), ''),
      NULLIF(BTRIM(av.motivo_excecao), ''),
      CASE
        WHEN aluno.nome IS NOT NULL THEN 'Cobranca avulsa - ' || aluno.nome
        ELSE 'Cobranca avulsa #' || av.id::text
      END
    ) AS descricao,
    'AVULSA'::text AS tipo_cobranca,
    COALESCE(av.valor_centavos, 0)::int AS valor_centavos,
    CASE
      WHEN av.pago_em IS NOT NULL
        OR UPPER(COALESCE(av.status, '')) IN ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA')
        THEN COALESCE(av.valor_centavos, 0)
      ELSE 0
    END::int AS valor_pago_centavos,
    CASE
      WHEN av.pago_em IS NOT NULL
        OR UPPER(COALESCE(av.status, '')) IN ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA')
        THEN 0
      ELSE COALESCE(av.valor_centavos, 0)
    END::int AS saldo_centavos,
    av.pago_em AS data_pagamento,
    CASE
      WHEN av.vencimento IS NOT NULL
       AND av.vencimento < CURRENT_DATE
       AND (
         av.pago_em IS NULL
         AND UPPER(COALESCE(av.status, '')) NOT IN ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA')
       )
        THEN (CURRENT_DATE - av.vencimento)
      ELSE 0
    END::int AS dias_atraso,
    vinc.fatura_id,
    vinc.periodo_referencia AS fatura_competencia,
    vinc.fatura_status,
    COALESCE(vinc.conta_conexao_id, conta_pessoa.conta_conexao_id) AS conta_conexao_id,
    COALESCE(vinc.tipo_conta, conta_pessoa.tipo_conta) AS tipo_conta,
    NULL::text AS neofin_charge_id,
    vinc.neofin_invoice_id,
    NULL::text AS link_pagamento,
    NULL::text AS linha_digitavel,
    av.criado_em AS created_at,
    av.atualizado_em AS updated_at
  FROM public.financeiro_cobrancas_avulsas av
  LEFT JOIN avulsas_vinculadas vinc
    ON vinc.cobranca_avulsa_id = av.id
   AND vinc.rn = 1
  LEFT JOIN contas_conexao_por_pessoa conta_pessoa
    ON conta_pessoa.pessoa_titular_id = av.pessoa_id
  LEFT JOIN public.pessoas pagador
    ON pagador.id = av.pessoa_id
  LEFT JOIN public.matriculas m
    ON av.origem_id = m.id
   AND (
     av.origem_tipo = 'MATRICULA'
     OR av.origem_tipo = 'MATRICULA_ENTRADA'
     OR av.origem_tipo ILIKE 'MATRICULA%'
   )
  LEFT JOIN public.pessoas aluno
    ON aluno.id = m.pessoa_id
),
operacional_union AS (
  SELECT
    base.cobranca_id,
    base.pessoa_id,
    base.pessoa_nome,
    base.competencia_ano_mes,
    base.data_vencimento,
    base.status_cobranca,
    base.origem_tipo,
    base.origem_subtipo,
    base.origem_id,
    base.descricao,
    base.valor_centavos,
    base.valor_pago_centavos,
    base.saldo_centavos AS saldo_aberto_centavos,
    base.dias_atraso,
    base.data_pagamento,
    base.neofin_charge_id,
    base.link_pagamento,
    base.linha_digitavel,
    base.created_at,
    base.updated_at,
    base.cobranca_fonte,
    base.cobranca_origem_id,
    base.tipo_cobranca,
    base.status_bruto,
    base.saldo_centavos,
    base.fatura_id,
    base.fatura_competencia,
    base.fatura_status,
    base.conta_conexao_id,
    base.tipo_conta,
    base.neofin_invoice_id
  FROM cobrancas_base base

  UNION ALL

  SELECT
    base.cobranca_id,
    base.pessoa_id,
    base.pessoa_nome,
    base.competencia_ano_mes,
    base.data_vencimento,
    base.status_cobranca,
    base.origem_tipo,
    base.origem_subtipo,
    base.origem_id,
    base.descricao,
    base.valor_centavos,
    base.valor_pago_centavos,
    base.saldo_centavos AS saldo_aberto_centavos,
    base.dias_atraso,
    base.data_pagamento,
    base.neofin_charge_id,
    base.link_pagamento,
    base.linha_digitavel,
    base.created_at,
    base.updated_at,
    base.cobranca_fonte,
    base.cobranca_origem_id,
    base.tipo_cobranca,
    base.status_bruto,
    base.saldo_centavos,
    base.fatura_id,
    base.fatura_competencia,
    base.fatura_status,
    base.conta_conexao_id,
    base.tipo_conta,
    base.neofin_invoice_id
  FROM avulsas_base base
),
operacional_status AS (
  SELECT
    o.*,
    CASE
      WHEN UPPER(COALESCE(o.status_bruto, '')) IN ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA')
        OR o.saldo_centavos <= 0
        OR (o.valor_centavos > 0 AND o.valor_pago_centavos >= o.valor_centavos)
        THEN 'PAGO'
      WHEN o.data_vencimento IS NOT NULL
       AND o.data_vencimento < CURRENT_DATE
        THEN 'PENDENTE_VENCIDO'
      ELSE 'PENDENTE_A_VENCER'
    END AS status_operacional
  FROM operacional_union o
),
operacional_neofin AS (
  SELECT
    o.*,
    CASE
      WHEN COALESCE(NULLIF(BTRIM(o.neofin_charge_id), ''), NULLIF(BTRIM(o.neofin_invoice_id), '')) IS NOT NULL
        THEN 'VINCULADA'
      WHEN o.status_operacional = 'PAGO'
        THEN 'NAO_SE_APLICA'
      WHEN o.tipo_cobranca = 'MENSALIDADE'
       AND o.fatura_id IS NOT NULL
       AND UPPER(COALESCE(o.fatura_status, '')) IN ('FECHADA', 'EM_ATRASO')
        THEN 'FALHA_INTEGRACAO'
      WHEN o.tipo_cobranca = 'MENSALIDADE'
       AND UPPER(COALESCE(o.origem_tipo, '')) IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
       AND o.fatura_id IS NULL
        THEN 'FALHA_INTEGRACAO'
      WHEN o.status_operacional IN ('PENDENTE_A_VENCER', 'PENDENTE_VENCIDO')
        THEN 'NAO_VINCULADA'
      ELSE 'NAO_SE_APLICA'
    END AS neofin_situacao_operacional
  FROM operacional_status o
),
operacional_final AS (
  SELECT
    o.*,
    CASE
      WHEN o.neofin_situacao_operacional = 'VINCULADA' AND o.status_operacional = 'PAGO'
        THEN 'LIQUIDADA'
      WHEN o.neofin_situacao_operacional = 'VINCULADA'
        THEN 'EM_COBRANCA'
      WHEN o.neofin_situacao_operacional = 'FALHA_INTEGRACAO'
        THEN 'FALHA_INTEGRACAO'
      ELSE 'SEM_NEOFIN'
    END AS neofin_status,
    CASE
      WHEN o.status_operacional = 'PAGO'
        THEN false
      WHEN o.neofin_situacao_operacional IN ('NAO_VINCULADA', 'FALHA_INTEGRACAO')
        THEN true
      ELSE false
    END AS permite_vinculo_manual
  FROM operacional_neofin o
)
SELECT
  o.cobranca_id,
  o.pessoa_id,
  COALESCE(
    NULLIF(BTRIM(o.pessoa_nome), ''),
    CASE
      WHEN o.pessoa_id IS NOT NULL THEN 'Pessoa #' || o.pessoa_id::text
      ELSE 'Pessoa nao identificada'
    END
  ) AS pessoa_nome,
  o.competencia_ano_mes,
  o.data_vencimento,
  o.status_cobranca,
  o.origem_tipo,
  o.origem_subtipo,
  o.origem_id,
  o.descricao,
  o.valor_centavos,
  o.valor_pago_centavos,
  o.saldo_centavos AS saldo_aberto_centavos,
  o.dias_atraso,
  o.data_pagamento,
  o.neofin_charge_id,
  o.link_pagamento,
  o.linha_digitavel,
  o.created_at,
  o.updated_at,
  o.cobranca_fonte,
  o.cobranca_origem_id,
  COALESCE(
    NULLIF(BTRIM(o.pessoa_nome), ''),
    CASE
      WHEN o.pessoa_id IS NOT NULL THEN 'Pessoa #' || o.pessoa_id::text
      ELSE 'Pessoa nao identificada'
    END
  ) || CASE WHEN o.pessoa_id IS NOT NULL THEN ' (#' || o.pessoa_id::text || ')' ELSE '' END AS pessoa_label,
  CASE SUBSTRING(o.competencia_ano_mes FROM 6 FOR 2)
    WHEN '01' THEN 'Janeiro'
    WHEN '02' THEN 'Fevereiro'
    WHEN '03' THEN 'Marco'
    WHEN '04' THEN 'Abril'
    WHEN '05' THEN 'Maio'
    WHEN '06' THEN 'Junho'
    WHEN '07' THEN 'Julho'
    WHEN '08' THEN 'Agosto'
    WHEN '09' THEN 'Setembro'
    WHEN '10' THEN 'Outubro'
    WHEN '11' THEN 'Novembro'
    WHEN '12' THEN 'Dezembro'
    ELSE o.competencia_ano_mes
  END || '/' || SUBSTRING(o.competencia_ano_mes FROM 1 FOR 4) AS competencia_label,
  o.tipo_cobranca,
  COALESCE(
    NULLIF(BTRIM(o.descricao), ''),
    CASE
      WHEN o.fatura_id IS NOT NULL AND o.fatura_competencia IS NOT NULL
        THEN 'Fatura #' || o.fatura_id::text || ' - Competencia ' || o.fatura_competencia
      WHEN o.origem_tipo IS NOT NULL AND o.origem_id IS NOT NULL
        THEN o.origem_tipo || ' #' || o.origem_id::text
      ELSE 'Cobranca operacional'
    END
  ) AS origem_referencia_label,
  o.saldo_centavos AS saldo_centavos,
  o.status_bruto,
  o.status_operacional,
  o.fatura_id,
  o.fatura_competencia,
  o.fatura_status,
  o.conta_conexao_id,
  o.tipo_conta,
  CASE UPPER(COALESCE(o.tipo_conta, ''))
    WHEN 'ALUNO' THEN 'Conta Interna Aluno'
    WHEN 'COLABORADOR' THEN 'Conta Interna Colaborador'
    ELSE 'Conta Interna'
  END AS tipo_conta_label,
  o.neofin_invoice_id,
  o.neofin_status,
  o.neofin_situacao_operacional,
  o.permite_vinculo_manual
FROM operacional_final o;

COMMENT ON VIEW public.vw_financeiro_cobrancas_operacionais IS
'Base operacional canonica para cobrancas mensais e avulsas, com pessoa, saldo, competencia, NeoFin e vinculo manual sem duplicar itens de fatura.';

COMMIT;
