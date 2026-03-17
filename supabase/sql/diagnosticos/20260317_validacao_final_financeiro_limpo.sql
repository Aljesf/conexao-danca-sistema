-- BLOCO A
WITH sementes AS (
  SELECT UNNEST(ARRAY[25, 26, 27, 38, 61, 138, 171, 182, 204, 205, 247, 274, 302, 402]::int[]) AS cobranca_id
),
recebimentos_agregados AS (
  SELECT
    r.cobranca_id,
    COUNT(*) AS qtd_recebimentos,
    MIN(r.id) AS recebimento_id
  FROM public.recebimentos r
  GROUP BY r.cobranca_id
),
faturas_agregadas AS (
  SELECT
    f.cobranca_id,
    MIN(f.id) AS fatura_id,
    MIN(f.periodo_referencia) AS periodo_referencia
  FROM public.credito_conexao_faturas f
  WHERE f.cobranca_id IS NOT NULL
  GROUP BY f.cobranca_id
),
sementes_base AS (
  SELECT
    c.id AS semente_id,
    c.pessoa_id,
    c.valor_centavos,
    c.created_at,
    COALESCE(c.competencia_ano_mes, fa.periodo_referencia) AS competencia_real
  FROM sementes s
  JOIN public.cobrancas c
    ON c.id = s.cobranca_id
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
),
sementes_resolvidas AS (
  SELECT
    sb.semente_id,
    sb.pessoa_id,
    sb.valor_centavos,
    COALESCE(
      sb.competencia_real,
      (
        SELECT fa2.periodo_referencia
        FROM public.cobrancas c2
        JOIN faturas_agregadas fa2
          ON fa2.cobranca_id = c2.id
        WHERE c2.pessoa_id = sb.pessoa_id
          AND c2.valor_centavos = sb.valor_centavos
        ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(c2.created_at, NOW()) - COALESCE(sb.created_at, NOW())))), c2.id
        LIMIT 1
      )
    ) AS competencia_real_grupo
  FROM sementes_base sb
),
grupos_alvo AS (
  SELECT DISTINCT
    sr.pessoa_id,
    sr.valor_centavos,
    sr.competencia_real_grupo,
    CONCAT(sr.pessoa_id, '|', COALESCE(sr.competencia_real_grupo, 'NULL'), '|', sr.valor_centavos) AS grupo_chave
  FROM sementes_resolvidas sr
),
base_regular AS (
  SELECT
    ga.grupo_chave,
    c.id AS cobranca_id,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    ga.competencia_real_grupo AS competencia_real,
    c.valor_centavos,
    c.origem_tipo,
    c.origem_id,
    c.status,
    c.created_at,
    CASE WHEN ra.qtd_recebimentos > 0 THEN TRUE ELSE FALSE END AS possui_recebimento,
    ra.recebimento_id,
    CASE WHEN fa.fatura_id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_fatura,
    fa.fatura_id
  FROM grupos_alvo ga
  JOIN public.cobrancas c
    ON c.pessoa_id = ga.pessoa_id
   AND c.valor_centavos = ga.valor_centavos
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  LEFT JOIN recebimentos_agregados ra
    ON ra.cobranca_id = c.id
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  WHERE COALESCE(c.competencia_ano_mes, fa.periodo_referencia) IS NOT DISTINCT FROM ga.competencia_real_grupo
),
base_sem_competencia AS (
  SELECT
    CONCAT(sr.pessoa_id, '|', COALESCE(sr.competencia_real_grupo, 'NULL'), '|', sr.valor_centavos) AS grupo_chave,
    c.id AS cobranca_id,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    sr.competencia_real_grupo AS competencia_real,
    c.valor_centavos,
    c.origem_tipo,
    c.origem_id,
    c.status,
    c.created_at,
    CASE WHEN ra.qtd_recebimentos > 0 THEN TRUE ELSE FALSE END AS possui_recebimento,
    ra.recebimento_id,
    CASE WHEN fa.fatura_id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_fatura,
    fa.fatura_id
  FROM sementes_resolvidas sr
  JOIN sementes_base sb
    ON sb.semente_id = sr.semente_id
  JOIN public.cobrancas c
    ON c.id = sr.semente_id
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  LEFT JOIN recebimentos_agregados ra
    ON ra.cobranca_id = c.id
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  WHERE sb.competencia_real IS NULL
),
base AS (
  SELECT DISTINCT * FROM base_regular
  UNION
  SELECT DISTINCT * FROM base_sem_competencia
)
SELECT
  grupo_chave,
  cobranca_id,
  pessoa_id,
  pessoa_nome,
  competencia_real,
  valor_centavos,
  origem_tipo,
  origem_id,
  status,
  created_at,
  possui_recebimento,
  recebimento_id,
  possui_fatura,
  fatura_id
FROM base
ORDER BY grupo_chave, created_at, cobranca_id;

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
ORDER BY c.origem_id;

-- BLOCO C
WITH faturas_agregadas AS (
  SELECT
    f.cobranca_id,
    MIN(f.periodo_referencia) AS periodo_referencia
  FROM public.credito_conexao_faturas f
  WHERE f.cobranca_id IS NOT NULL
  GROUP BY f.cobranca_id
),
base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    c.valor_centavos,
    c.origem_tipo,
    c.status,
    COALESCE(c.competencia_ano_mes, fa.periodo_referencia) AS competencia_real
  FROM public.cobrancas c
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  WHERE c.status <> 'CANCELADA'
),
grupos_duplicados AS (
  SELECT
    pessoa_id,
    pessoa_nome,
    competencia_real,
    valor_centavos,
    COUNT(*) AS quantidade,
    ARRAY_AGG(cobranca_id ORDER BY cobranca_id) AS cobrancas_ids,
    STRING_AGG(DISTINCT origem_tipo, ', ' ORDER BY origem_tipo) AS origens
  FROM base
  WHERE competencia_real IS NOT NULL
  GROUP BY pessoa_id, pessoa_nome, competencia_real, valor_centavos
  HAVING COUNT(*) > 1
)
SELECT
  pessoa_id,
  pessoa_nome,
  competencia_real,
  valor_centavos,
  quantidade,
  cobrancas_ids,
  origens
FROM grupos_duplicados
ORDER BY pessoa_nome, competencia_real, valor_centavos;

-- BLOCO D
WITH historico_grupo AS (
  SELECT UNNEST(ARRAY[25, 26, 27, 38, 61, 138, 171, 182, 204, 205, 231, 232, 234, 238, 242, 244, 245, 247, 259, 274, 300, 302, 314, 370, 374, 402, 413]::int[]) AS cobranca_id
),
faturas_agregadas AS (
  SELECT
    f.cobranca_id,
    MIN(f.periodo_referencia) AS periodo_referencia
  FROM public.credito_conexao_faturas f
  WHERE f.cobranca_id IS NOT NULL
  GROUP BY f.cobranca_id
),
base_ativa AS (
  SELECT
    c.id,
    c.pessoa_id,
    c.valor_centavos,
    COALESCE(c.competencia_ano_mes, fa.periodo_referencia) AS competencia_real
  FROM public.cobrancas c
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  WHERE c.status <> 'CANCELADA'
),
grupos_duplicados AS (
  SELECT
    pessoa_id,
    competencia_real,
    valor_centavos,
    COUNT(*) AS quantidade
  FROM base_ativa
  WHERE competencia_real IS NOT NULL
  GROUP BY pessoa_id, competencia_real, valor_centavos
  HAVING COUNT(*) > 1
)
SELECT
  'cobrancas_canceladas_nesta_etapa' AS metrica,
  COUNT(*)::text AS valor
FROM public.cobrancas
WHERE id IN (26, 231, 232, 234, 238, 242, 244, 245, 259, 300, 314, 370, 374, 413)
  AND status = 'CANCELADA'
UNION ALL
SELECT
  'cobrancas_mantidas_no_historico',
  COUNT(*)::text
FROM public.cobrancas
WHERE id IN (25, 27, 38, 61, 138, 171, 182, 204, 205, 247, 274, 302, 402)
  AND status <> 'CANCELADA'
UNION ALL
SELECT
  'grupos_duplicados_ativos_restantes',
  COUNT(*)::text
FROM grupos_duplicados
UNION ALL
SELECT
  'cobrancas_ativas_no_passivo_historico',
  COUNT(*)::text
FROM public.cobrancas c
WHERE c.id IN (SELECT cobranca_id FROM historico_grupo)
  AND c.status <> 'CANCELADA';
