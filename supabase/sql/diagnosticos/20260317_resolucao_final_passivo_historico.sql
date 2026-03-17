WITH sementes AS (
  SELECT UNNEST(ARRAY[25, 26, 27, 38, 61, 138, 171, 182, 204, 205, 247, 274, 302, 402]::int[]) AS cobranca_id
),
recebimentos_agregados AS (
  SELECT
    r.cobranca_id,
    COUNT(*) AS qtd_recebimentos,
    MIN(r.id) AS recebimento_id,
    ARRAY_AGG(r.id ORDER BY r.id) AS recebimentos_ids,
    SUM(r.valor_centavos) AS valor_recebido_centavos
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
    p.nome AS pessoa_nome,
    c.valor_centavos,
    c.created_at,
    c.competencia_ano_mes,
    COALESCE(c.competencia_ano_mes, fa.periodo_referencia) AS competencia_real
  FROM sementes s
  JOIN public.cobrancas c
    ON c.id = s.cobranca_id
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
),
sementes_resolvidas AS (
  SELECT
    sb.semente_id,
    sb.pessoa_id,
    sb.pessoa_nome,
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
          AND c2.status <> 'CANCELADA'
        ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(c2.created_at, NOW()) - COALESCE(sb.created_at, NOW())))), c2.id
        LIMIT 1
      )
    ) AS competencia_real_grupo
  FROM sementes_base sb
),
grupos_alvo AS (
  SELECT DISTINCT
    sr.pessoa_id,
    sr.pessoa_nome,
    sr.valor_centavos,
    sr.competencia_real_grupo,
    CONCAT(sr.pessoa_id, '|', COALESCE(sr.competencia_real_grupo, 'NULL'), '|', sr.valor_centavos) AS grupo_chave
  FROM sementes_resolvidas sr
),
base_regular AS (
  SELECT
    ga.grupo_chave,
    ga.pessoa_id,
    ga.pessoa_nome,
    ga.valor_centavos,
    ga.competencia_real_grupo AS competencia_real,
    c.id AS cobranca_id,
    c.origem_tipo,
    c.origem_id,
    c.status,
    c.created_at,
    c.updated_at,
    c.competencia_ano_mes,
    CASE WHEN ra.qtd_recebimentos > 0 THEN TRUE ELSE FALSE END AS possui_recebimento,
    ra.qtd_recebimentos,
    ra.recebimento_id,
    ra.recebimentos_ids,
    COALESCE(ra.valor_recebido_centavos, 0) AS valor_recebido_centavos,
    CASE WHEN fa.fatura_id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_fatura,
    fa.fatura_id,
    fa.periodo_referencia AS fatura_periodo_referencia
  FROM grupos_alvo ga
  JOIN public.cobrancas c
    ON c.pessoa_id = ga.pessoa_id
   AND c.valor_centavos = ga.valor_centavos
   AND c.status <> 'CANCELADA'
  LEFT JOIN recebimentos_agregados ra
    ON ra.cobranca_id = c.id
  LEFT JOIN faturas_agregadas fa
    ON fa.cobranca_id = c.id
  WHERE COALESCE(c.competencia_ano_mes, fa.periodo_referencia) IS NOT DISTINCT FROM ga.competencia_real_grupo
),
base_sem_competencia AS (
  SELECT
    CONCAT(sr.pessoa_id, '|', COALESCE(sr.competencia_real_grupo, 'NULL'), '|', sr.valor_centavos) AS grupo_chave,
    sr.pessoa_id,
    sr.pessoa_nome,
    sr.valor_centavos,
    sr.competencia_real_grupo AS competencia_real,
    c.id AS cobranca_id,
    c.origem_tipo,
    c.origem_id,
    c.status,
    c.created_at,
    c.updated_at,
    c.competencia_ano_mes,
    CASE WHEN ra.qtd_recebimentos > 0 THEN TRUE ELSE FALSE END AS possui_recebimento,
    ra.qtd_recebimentos,
    ra.recebimento_id,
    ra.recebimentos_ids,
    COALESCE(ra.valor_recebido_centavos, 0) AS valor_recebido_centavos,
    CASE WHEN fa.fatura_id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_fatura,
    fa.fatura_id,
    fa.periodo_referencia AS fatura_periodo_referencia
  FROM sementes_resolvidas sr
  JOIN sementes_base sb
    ON sb.semente_id = sr.semente_id
  JOIN public.cobrancas c
    ON c.id = sr.semente_id
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
),
estatisticas AS (
  SELECT
    b.*,
    COUNT(*) OVER (PARTITION BY b.grupo_chave) AS quantidade_no_grupo,
    COUNT(*) FILTER (WHERE b.possui_recebimento) OVER (PARTITION BY b.grupo_chave) AS qtd_com_recebimento,
    COUNT(*) FILTER (WHERE b.possui_fatura) OVER (PARTITION BY b.grupo_chave) AS qtd_com_fatura,
    ROW_NUMBER() OVER (
      PARTITION BY b.grupo_chave
      ORDER BY CASE WHEN b.possui_recebimento THEN 0 ELSE 1 END, b.created_at ASC NULLS LAST, b.cobranca_id ASC
    ) AS ordem_recebimento_mais_antigo,
    ROW_NUMBER() OVER (
      PARTITION BY b.grupo_chave
      ORDER BY b.created_at ASC NULLS LAST, b.cobranca_id ASC
    ) AS ordem_cronologica
  FROM base b
),
decisoes AS (
  SELECT
    e.*,
    CASE
      WHEN e.qtd_com_recebimento = 1 AND e.possui_recebimento THEN 'MANTER'
      WHEN e.qtd_com_recebimento = 1 AND NOT e.possui_recebimento THEN 'CANCELAR'
      WHEN e.qtd_com_recebimento > 1 AND e.ordem_recebimento_mais_antigo = 1 THEN 'MANTER'
      WHEN e.qtd_com_recebimento > 1 THEN 'CANCELAR'
      WHEN e.qtd_com_fatura = 1 AND e.possui_fatura THEN 'MANTER'
      WHEN e.qtd_com_fatura = 1 AND NOT e.possui_fatura THEN 'CANCELAR'
      WHEN e.ordem_cronologica = 1 THEN 'MANTER'
      ELSE 'CANCELAR'
    END AS decisao_final,
    CASE
      WHEN e.qtd_com_recebimento = 1 AND e.possui_recebimento THEN 'REGRA_1_RECEBIMENTO_UNICO'
      WHEN e.qtd_com_recebimento = 1 AND NOT e.possui_recebimento THEN 'REGRA_1_CANCELAR_SEM_RECEBIMENTO'
      WHEN e.qtd_com_recebimento > 1 THEN 'REGRA_2_MULTIPLO_RECEBIMENTO_LEGADO'
      WHEN e.qtd_com_fatura = 1 AND e.possui_fatura THEN 'REGRA_3_FATURA_UNICA'
      WHEN e.qtd_com_fatura = 1 AND NOT e.possui_fatura THEN 'REGRA_3_CANCELAR_SEM_FATURA'
      WHEN e.ordem_cronologica = 1 THEN 'REGRA_4_MAIS_ANTIGA'
      ELSE 'REGRA_4_CANCELAR_RESTANTES'
    END AS motivo_decisao,
    CASE
      WHEN e.qtd_com_recebimento > 1 THEN 'MULTIPLO_RECEBIMENTO_LEGADO'
      WHEN e.qtd_com_recebimento = 1 THEN 'RECEBIMENTO_LEGADO_PREVALECE'
      WHEN e.qtd_com_fatura = 1 THEN 'FATURA_UNICA_PREVALECE'
      ELSE 'MAIS_ANTIGA_PREVALECE'
    END AS observacao,
    CASE
      WHEN e.qtd_com_recebimento > 1 AND e.ordem_recebimento_mais_antigo = 1 THEN 1
      WHEN e.qtd_com_recebimento > 1 THEN 2
      WHEN e.qtd_com_recebimento = 1 AND e.possui_recebimento THEN 1
      WHEN e.qtd_com_recebimento = 1 AND NOT e.possui_recebimento THEN 2
      WHEN e.qtd_com_fatura = 1 AND e.possui_fatura THEN 3
      WHEN e.qtd_com_fatura = 1 AND NOT e.possui_fatura THEN 4
      WHEN e.ordem_cronologica = 1 THEN 5
      ELSE 6
    END AS ordem_precedencia
  FROM estatisticas e
)
SELECT
  grupo_chave,
  cobranca_id,
  pessoa_id,
  pessoa_nome,
  valor_centavos,
  origem_tipo,
  origem_id,
  status,
  created_at,
  competencia_real,
  possui_recebimento,
  recebimento_id,
  recebimentos_ids,
  possui_fatura,
  fatura_id,
  decisao_final,
  motivo_decisao,
  observacao,
  ordem_precedencia
FROM decisoes
ORDER BY grupo_chave, ordem_precedencia, created_at, cobranca_id;
