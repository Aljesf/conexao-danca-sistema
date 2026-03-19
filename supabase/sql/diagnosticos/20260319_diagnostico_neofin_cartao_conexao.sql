-- Diagnostico de integracao Neofin x Cartao Conexao
-- Objetivo:
-- 1) identificar qual cobranca a fatura aponta hoje;
-- 2) distinguir cobranca canonica da fatura versus cobranca-item;
-- 3) verificar ausencia de neofin_invoice_id;
-- 4) localizar referencias locais da Neofin salvas apenas como integration_identifier textual;
-- 5) detectar possiveis duplicidades externas por competencia.

-- 1. Panorama principal por fatura
-- Responde:
-- - qual cobranca esta sendo exibida pela referencia atual da fatura;
-- - se ela e canonica ou cobranca-item;
-- - se a fatura ja tem neofin_invoice_id;
-- - se a referencia local da Neofin parece numerica ou apenas textual.
WITH cobranca_vinculada AS (
  SELECT
    f.id AS fatura_id,
    f.conta_conexao_id,
    f.periodo_referencia,
    f.status AS status_fatura,
    f.data_vencimento,
    f.valor_total_centavos,
    f.cobranca_id,
    f.neofin_invoice_id,
    c.id AS cobranca_vinculada_id,
    c.origem_tipo AS cobranca_vinculada_origem_tipo,
    c.origem_subtipo AS cobranca_vinculada_origem_subtipo,
    c.origem_id AS cobranca_vinculada_origem_id,
    c.status AS cobranca_vinculada_status,
    c.metodo_pagamento AS cobranca_vinculada_metodo_pagamento,
    c.neofin_charge_id AS cobranca_vinculada_neofin_charge_id,
    c.link_pagamento AS cobranca_vinculada_link_pagamento,
    c.linha_digitavel AS cobranca_vinculada_linha_digitavel,
    c.updated_at AS cobranca_vinculada_updated_at
  FROM public.credito_conexao_faturas f
  LEFT JOIN public.cobrancas c
    ON c.id = f.cobranca_id
),
cobranca_canonica AS (
  SELECT DISTINCT ON (c.origem_id)
    c.origem_id AS fatura_id,
    c.id AS cobranca_canonica_id,
    c.origem_tipo AS cobranca_canonica_origem_tipo,
    c.origem_subtipo AS cobranca_canonica_origem_subtipo,
    c.status AS cobranca_canonica_status,
    c.metodo_pagamento AS cobranca_canonica_metodo_pagamento,
    c.neofin_charge_id AS cobranca_canonica_neofin_charge_id,
    c.link_pagamento AS cobranca_canonica_link_pagamento,
    c.linha_digitavel AS cobranca_canonica_linha_digitavel,
    c.updated_at AS cobranca_canonica_updated_at
  FROM public.cobrancas c
  WHERE c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
  ORDER BY c.origem_id, c.updated_at DESC NULLS LAST, c.id DESC
)
SELECT
  cv.fatura_id,
  cv.conta_conexao_id,
  cv.periodo_referencia,
  cv.status_fatura,
  cv.data_vencimento,
  cv.valor_total_centavos,
  cv.cobranca_id,
  cv.neofin_invoice_id,
  cv.cobranca_vinculada_id,
  cv.cobranca_vinculada_origem_tipo,
  cv.cobranca_vinculada_origem_subtipo,
  cv.cobranca_vinculada_status,
  cv.cobranca_vinculada_metodo_pagamento,
  cv.cobranca_vinculada_neofin_charge_id,
  cc.cobranca_canonica_id,
  cc.cobranca_canonica_origem_tipo,
  cc.cobranca_canonica_origem_subtipo,
  cc.cobranca_canonica_status,
  cc.cobranca_canonica_metodo_pagamento,
  cc.cobranca_canonica_neofin_charge_id,
  CASE
    WHEN cv.cobranca_vinculada_id IS NULL THEN 'SEM_COBRANCA_VINCULADA'
    WHEN cv.cobranca_vinculada_origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA') THEN 'CANONICA'
    ELSE 'COBRANCA_ITEM_OU_OUTRA_ORIGEM'
  END AS classificacao_cobranca_vinculada,
  CASE
    WHEN NULLIF(BTRIM(cv.neofin_invoice_id), '') IS NULL THEN 'SEM_INVOICE_LOCAL'
    WHEN cv.neofin_invoice_id ~ '^[0-9]{8,}$' THEN 'INVOICE_NUMERICA'
    ELSE 'INVOICE_TEXTO_NAO_NUMERICO'
  END AS situacao_invoice_local,
  CASE
    WHEN NULLIF(BTRIM(COALESCE(cc.cobranca_canonica_neofin_charge_id, cv.cobranca_vinculada_neofin_charge_id)), '') IS NULL THEN 'SEM_REFERENCIA_NEOFIN'
    WHEN COALESCE(cc.cobranca_canonica_neofin_charge_id, cv.cobranca_vinculada_neofin_charge_id) ~ '^[0-9]{8,}$' THEN 'REFERENCIA_NUMERICA'
    ELSE 'REFERENCIA_TEXTUAL_OU_FALLBACK'
  END AS situacao_referencia_neofin
FROM cobranca_vinculada cv
LEFT JOIN cobranca_canonica cc
  ON cc.fatura_id = cv.fatura_id
ORDER BY cv.fatura_id DESC;

-- 2. Faturas que ainda apontam para cobranca-item em vez da cobranca canonica da fatura
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  f.cobranca_id,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id,
  c.status,
  c.neofin_charge_id,
  c.link_pagamento,
  c.linha_digitavel
FROM public.credito_conexao_faturas f
JOIN public.cobrancas c
  ON c.id = f.cobranca_id
WHERE c.origem_tipo NOT IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
ORDER BY f.id DESC;

-- 3. Faturas canonicas sem neofin_invoice_id mesmo tendo referencia externa
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  f.neofin_invoice_id,
  c.id AS cobranca_canonica_id,
  c.neofin_charge_id,
  c.status,
  c.link_pagamento,
  c.linha_digitavel
FROM public.credito_conexao_faturas f
JOIN public.cobrancas c
  ON c.origem_id = f.id
 AND c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
WHERE NULLIF(BTRIM(f.neofin_invoice_id), '') IS NULL
  AND NULLIF(BTRIM(c.neofin_charge_id), '') IS NOT NULL
ORDER BY f.id DESC;

-- 4. Referencias textuais que sugerem fallback pelo integration_identifier
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  c.id AS cobranca_id,
  c.neofin_charge_id,
  f.neofin_invoice_id,
  c.status,
  c.updated_at
FROM public.credito_conexao_faturas f
JOIN public.cobrancas c
  ON c.origem_id = f.id
 AND c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
WHERE NULLIF(BTRIM(c.neofin_charge_id), '') IS NOT NULL
  AND c.neofin_charge_id !~ '^[0-9]{8,}$'
ORDER BY c.updated_at DESC NULLS LAST, f.id DESC;

-- 5. Itens de matricula/cartao conexao que possuem integracao externa propria
-- Esses casos podem contaminar a UI se a leitura priorizar a cobranca-item.
SELECT
  c.id AS cobranca_id,
  c.pessoa_id,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id,
  c.descricao,
  c.status,
  c.neofin_charge_id,
  c.link_pagamento,
  c.linha_digitavel,
  c.updated_at
FROM public.cobrancas c
WHERE c.origem_tipo IN ('MATRICULA', 'CARTAO_CONEXAO')
  AND NULLIF(BTRIM(c.neofin_charge_id), '') IS NOT NULL
ORDER BY c.updated_at DESC NULLS LAST, c.id DESC;

-- 6. Competencias com mais de uma cobranca externa canonica para a mesma fatura
-- Ajuda a encontrar duplicidade de criacao externa.
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  COUNT(*) AS quantidade_cobrancas_canonicas,
  STRING_AGG(c.id::text, ', ' ORDER BY c.id) AS cobranca_ids,
  STRING_AGG(COALESCE(c.neofin_charge_id, '-'), ', ' ORDER BY c.id) AS referencias_neofin
FROM public.credito_conexao_faturas f
JOIN public.cobrancas c
  ON c.origem_id = f.id
 AND c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
WHERE c.status <> 'CANCELADA'
GROUP BY f.id, f.periodo_referencia
HAVING COUNT(*) > 1
ORDER BY f.id DESC;

-- 7. Conferencia de valores da fatura versus itens vinculados
-- Mostra se a cobranca exibida reflete o total real dos lancamentos da fatura.
WITH itens AS (
  SELECT
    fl.fatura_id,
    COUNT(*) AS quantidade_itens,
    SUM(COALESCE(l.valor_centavos, 0)) AS total_itens_centavos
  FROM public.credito_conexao_fatura_lancamentos fl
  JOIN public.credito_conexao_lancamentos l
    ON l.id = fl.lancamento_id
  GROUP BY fl.fatura_id
)
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  f.valor_total_centavos AS valor_total_fatura_centavos,
  i.total_itens_centavos,
  i.quantidade_itens,
  c.id AS cobranca_canonica_id,
  c.valor_centavos AS valor_cobranca_canonica_centavos,
  c.status AS status_cobranca_canonica
FROM public.credito_conexao_faturas f
LEFT JOIN itens i
  ON i.fatura_id = f.id
LEFT JOIN public.cobrancas c
  ON c.origem_id = f.id
 AND c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
 AND c.status <> 'CANCELADA'
ORDER BY f.id DESC;

-- 8. Recebimentos associados as cobrancas canonicas da fatura
-- Ajuda a conferir se o recebimento confirmado esta vinculado ao objeto canonico.
SELECT
  f.id AS fatura_id,
  f.periodo_referencia,
  c.id AS cobranca_canonica_id,
  c.neofin_charge_id,
  r.id AS recebimento_id,
  r.valor_centavos,
  r.data_pagamento,
  r.metodo_pagamento,
  r.forma_pagamento_codigo,
  r.origem_sistema
FROM public.credito_conexao_faturas f
JOIN public.cobrancas c
  ON c.origem_id = f.id
 AND c.origem_tipo IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
LEFT JOIN public.recebimentos r
  ON r.cobranca_id = c.id
ORDER BY f.id DESC, r.data_pagamento DESC NULLS LAST, r.id DESC NULLS LAST;
