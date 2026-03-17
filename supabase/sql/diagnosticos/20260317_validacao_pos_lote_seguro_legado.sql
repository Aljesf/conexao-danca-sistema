-- BLOCO A
SELECT
  c.id AS cobranca_id,
  c.status,
  c.origem_tipo,
  c.origem_subtipo,
  c.updated_at
FROM public.cobrancas c
WHERE c.id IN (50, 51, 72, 73, 116, 117, 127, 149, 160, 172, 193, 217, 261, 338)
ORDER BY c.id;

-- BLOCO B
SELECT
  c.origem_id,
  COUNT(*) AS quantidade,
  ARRAY_AGG(c.id ORDER BY c.id) AS cobrancas_ids
FROM public.cobrancas c
WHERE c.origem_tipo = 'FATURA_CREDITO_CONEXAO'
  AND c.status <> 'CANCELADA'
GROUP BY c.origem_id
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, c.origem_id;

-- BLOCO C
WITH receb AS (
  SELECT
    cobranca_id,
    COUNT(*) AS qtd_recebimentos,
    SUM(valor_centavos) AS valor_recebido
  FROM public.recebimentos
  GROUP BY cobranca_id
),
base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    c.valor_centavos,
    c.status,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    COALESCE(c.competencia_ano_mes, f.periodo_referencia) AS competencia_real,
    c.competencia_ano_mes,
    c.created_at,
    CASE WHEN f.id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_fatura,
    f.id AS fatura_id,
    COALESCE(r.qtd_recebimentos, 0) AS qtd_recebimentos,
    COALESCE(r.valor_recebido, 0) AS valor_recebido,
    COUNT(*) OVER (
      PARTITION BY c.pessoa_id, COALESCE(c.competencia_ano_mes, f.periodo_referencia), c.valor_centavos
    ) AS quantidade_grupo_real,
    ROW_NUMBER() OVER (
      PARTITION BY c.pessoa_id, COALESCE(c.competencia_ano_mes, f.periodo_referencia), c.valor_centavos
      ORDER BY c.created_at ASC NULLS LAST, c.id ASC
    ) AS ordem_no_grupo
  FROM public.cobrancas c
  LEFT JOIN public.credito_conexao_faturas f
    ON f.cobranca_id = c.id
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  LEFT JOIN receb r
    ON r.cobranca_id = c.id
  WHERE c.status <> 'CANCELADA'
),
pendencias AS (
  SELECT
    CONCAT(b.pessoa_id, '|', COALESCE(b.competencia_real, 'NULL'), '|', b.valor_centavos) AS grupo_chave_real,
    b.pessoa_id,
    b.pessoa_nome,
    b.competencia_real,
    b.valor_centavos,
    b.cobranca_id,
    b.origem_tipo,
    b.origem_subtipo,
    b.status,
    b.possui_fatura,
    b.fatura_id,
    b.qtd_recebimentos,
    b.valor_recebido,
    b.ordem_no_grupo,
    CASE
      WHEN b.cobranca_id = 25 THEN 'ID_25_HISTORICO_SEM_COMPETENCIA'
      WHEN b.origem_tipo = 'MATRICULA' AND b.qtd_recebimentos > 0 THEN 'RECEBIMENTO_LEGADO_EXIGE_REVISAO_MANUAL'
      ELSE 'OUTRO'
    END AS tipo_pendencia
  FROM base b
  WHERE (
    b.quantidade_grupo_real > 1
    AND b.origem_tipo = 'MATRICULA'
    AND b.qtd_recebimentos > 0
  )
  OR b.cobranca_id = 25
)
SELECT
  grupo_chave_real,
  pessoa_id,
  pessoa_nome,
  competencia_real,
  valor_centavos,
  cobranca_id,
  origem_tipo,
  origem_subtipo,
  status,
  possui_fatura,
  fatura_id,
  qtd_recebimentos,
  valor_recebido,
  ordem_no_grupo,
  tipo_pendencia
FROM pendencias
ORDER BY tipo_pendencia, pessoa_nome, competencia_real, cobranca_id;

-- BLOCO D
WITH receb AS (
  SELECT
    cobranca_id,
    COUNT(*) AS qtd_recebimentos
  FROM public.recebimentos
  GROUP BY cobranca_id
),
base AS (
  SELECT
    c.id,
    c.pessoa_id,
    c.origem_tipo,
    c.valor_centavos,
    c.status,
    COALESCE(c.competencia_ano_mes, f.periodo_referencia) AS competencia_real,
    f.id AS fatura_id,
    COALESCE(r.qtd_recebimentos, 0) AS qtd_recebimentos
  FROM public.cobrancas c
  LEFT JOIN public.credito_conexao_faturas f
    ON f.cobranca_id = c.id
  LEFT JOIN receb r
    ON r.cobranca_id = c.id
  WHERE c.status <> 'CANCELADA'
),
lote AS (
  SELECT COUNT(*) AS quantidade_cancelada
  FROM public.cobrancas
  WHERE id IN (50, 51, 72, 73, 116, 117, 127, 149, 160, 172, 193, 217, 261, 338)
    AND status = 'CANCELADA'
),
grupos_restantes AS (
  SELECT
    pessoa_id,
    competencia_real,
    valor_centavos,
    COUNT(*) AS quantidade
  FROM base
  WHERE competencia_real IS NOT NULL
  GROUP BY pessoa_id, competencia_real, valor_centavos
  HAVING COUNT(*) > 1
),
casos_manuais AS (
  SELECT COUNT(*) AS quantidade_manual
  FROM base b
  WHERE b.origem_tipo = 'MATRICULA'
    AND b.qtd_recebimentos > 0
    AND EXISTS (
      SELECT 1
      FROM base par
      WHERE par.pessoa_id = b.pessoa_id
        AND par.valor_centavos = b.valor_centavos
        AND COALESCE(par.competencia_real, '') = COALESCE(b.competencia_real, '')
        AND par.origem_tipo = 'FATURA_CREDITO_CONEXAO'
        AND par.fatura_id IS NOT NULL
    )
)
SELECT
  'cobrancas_lote_canceladas' AS metrica,
  (SELECT quantidade_cancelada FROM lote)::text AS valor
UNION ALL
SELECT
  'grupos_duplicados_restantes_competencia_real',
  (SELECT COUNT(*) FROM grupos_restantes)::text
UNION ALL
SELECT
  'cobrancas_envolvidas_restantes_competencia_real',
  COALESCE((SELECT SUM(quantidade) FROM grupos_restantes), 0)::text
UNION ALL
SELECT
  'casos_em_revisao_manual',
  (SELECT quantidade_manual FROM casos_manuais)::text
UNION ALL
SELECT
  'id25_historico_ativo',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.cobrancas
      WHERE id = 25
        AND status <> 'CANCELADA'
    ) THEN 'SIM'
    ELSE 'NAO'
  END;
