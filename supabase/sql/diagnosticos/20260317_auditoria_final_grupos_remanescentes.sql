WITH grupos AS (
  SELECT
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos,
    COUNT(*) AS quantidade_grupo
  FROM public.cobrancas c
  WHERE c.status <> 'CANCELADA'
  GROUP BY c.pessoa_id, c.competencia_ano_mes, c.valor_centavos
  HAVING COUNT(*) > 1
),
faturas AS (
  SELECT
    f.cobranca_id,
    MIN(f.id) AS fatura_id,
    MIN(f.periodo_referencia) AS fatura_periodo_referencia
  FROM public.credito_conexao_faturas f
  WHERE f.cobranca_id IS NOT NULL
  GROUP BY f.cobranca_id
),
base AS (
  SELECT
    CONCAT(c.pessoa_id, '|', COALESCE(c.competencia_ano_mes, 'NULL'), '|', c.valor_centavos) AS grupo_chave,
    c.pessoa_id,
    p.nome AS pessoa_nome,
    c.valor_centavos,
    c.competencia_ano_mes,
    c.id AS cobranca_id,
    c.origem_tipo,
    c.origem_id,
    c.status,
    c.created_at,
    c.updated_at,
    CASE WHEN f.fatura_id IS NOT NULL THEN TRUE ELSE FALSE END AS possui_vinculo_fatura,
    f.fatura_id,
    f.fatura_periodo_referencia,
    g.quantidade_grupo,
    ROW_NUMBER() OVER (
      PARTITION BY c.pessoa_id, c.competencia_ano_mes, c.valor_centavos
      ORDER BY c.created_at ASC NULLS LAST, c.id ASC
    ) AS ordem_cronologica_no_grupo,
    SUM(CASE WHEN f.fatura_id IS NOT NULL THEN 1 ELSE 0 END) OVER (
      PARTITION BY c.pessoa_id, c.competencia_ano_mes, c.valor_centavos
    ) AS qtd_vinculadas
  FROM public.cobrancas c
  INNER JOIN grupos g
    ON g.pessoa_id = c.pessoa_id
   AND g.competencia_ano_mes IS NOT DISTINCT FROM c.competencia_ano_mes
   AND g.valor_centavos = c.valor_centavos
  LEFT JOIN public.pessoas p
    ON p.id = c.pessoa_id
  LEFT JOIN faturas f
    ON f.cobranca_id = c.id
  WHERE c.status <> 'CANCELADA'
),
estatisticas_grupo AS (
  SELECT
    grupo_chave,
    COUNT(DISTINCT fatura_periodo_referencia) AS qtd_periodos_fatura_distintos
  FROM base
  GROUP BY grupo_chave
)
SELECT
  b.grupo_chave,
  b.pessoa_id,
  b.pessoa_nome,
  b.valor_centavos,
  b.competencia_ano_mes,
  b.cobranca_id,
  b.origem_tipo,
  b.origem_id,
  b.status,
  b.created_at,
  b.updated_at,
  b.possui_vinculo_fatura,
  b.fatura_id,
  b.fatura_periodo_referencia,
  b.ordem_cronologica_no_grupo,
  CASE
    WHEN b.qtd_vinculadas = 1 AND b.possui_vinculo_fatura THEN 'MANTER_VINCULADA'
    WHEN b.qtd_vinculadas = 0 AND b.ordem_cronologica_no_grupo = 1 THEN 'MANTER_MAIS_ANTIGA'
    ELSE 'REVISAO_MANUAL'
  END AS recomendacao_tecnica_preliminar,
  CASE
    WHEN b.qtd_vinculadas >= 2 AND e.qtd_periodos_fatura_distintos >= 2 THEN 'faturas de periodos distintos no mesmo grupo heuristico'
    WHEN b.qtd_vinculadas >= 2 THEN 'mais de uma cobranca vinculada a fatura no mesmo grupo heuristico'
    WHEN b.qtd_vinculadas = 1 AND b.possui_vinculo_fatura THEN 'ha uma cobranca vinculada; revisar demais linhas antes de cancelar'
    WHEN b.qtd_vinculadas = 0 AND b.ordem_cronologica_no_grupo = 1 THEN 'sugestao preliminar pela ordem cronologica'
    ELSE 'grupo sem criterio automatico seguro'
  END AS observacao_curta
FROM base b
LEFT JOIN estatisticas_grupo e
  ON e.grupo_chave = b.grupo_chave
ORDER BY b.grupo_chave, b.ordem_cronologica_no_grupo, b.cobranca_id;
