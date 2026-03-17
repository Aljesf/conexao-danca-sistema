WITH duplicidade_canonica AS (
  SELECT
    origem_id,
    COUNT(*) AS quantidade
  FROM public.cobrancas
  WHERE origem_tipo = 'FATURA_CREDITO_CONEXAO'
    AND status <> 'CANCELADA'
  GROUP BY origem_id
  HAVING COUNT(*) > 1
),
grupos_raw AS (
  SELECT
    pessoa_id,
    competencia_ano_mes,
    valor_centavos,
    COUNT(*) AS quantidade
  FROM public.cobrancas
  WHERE status <> 'CANCELADA'
  GROUP BY pessoa_id, competencia_ano_mes, valor_centavos
  HAVING COUNT(*) > 1
),
base_competencia_real AS (
  SELECT
    c.id,
    c.pessoa_id,
    c.valor_centavos,
    c.status,
    c.origem_tipo,
    COALESCE(c.competencia_ano_mes, f.periodo_referencia) AS competencia_real
  FROM public.cobrancas c
  LEFT JOIN public.credito_conexao_faturas f
    ON f.cobranca_id = c.id
  WHERE c.status <> 'CANCELADA'
),
grupos_competencia_real AS (
  SELECT
    pessoa_id,
    competencia_real,
    valor_centavos,
    COUNT(*) AS quantidade,
    ARRAY_AGG(id ORDER BY id) AS cobrancas_ids
  FROM base_competencia_real
  WHERE competencia_real IS NOT NULL
  GROUP BY pessoa_id, competencia_real, valor_centavos
  HAVING COUNT(*) > 1
),
recebimentos_por_cobranca AS (
  SELECT
    cobranca_id,
    COUNT(*) AS qtd_recebimentos
  FROM public.recebimentos
  GROUP BY cobranca_id
),
lote_seguro AS (
  SELECT
    b.id
  FROM base_competencia_real b
  LEFT JOIN public.credito_conexao_faturas f
    ON f.cobranca_id = b.id
  LEFT JOIN recebimentos_por_cobranca r
    ON r.cobranca_id = b.id
  WHERE b.origem_tipo = 'MATRICULA'
    AND COALESCE(r.qtd_recebimentos, 0) = 0
    AND EXISTS (
      SELECT 1
      FROM base_competencia_real par
      LEFT JOIN public.credito_conexao_faturas fpar
        ON fpar.cobranca_id = par.id
      WHERE par.pessoa_id = b.pessoa_id
        AND par.valor_centavos = b.valor_centavos
        AND par.origem_tipo = 'FATURA_CREDITO_CONEXAO'
        AND COALESCE(par.competencia_real, '') = COALESCE(b.competencia_real, '')
        AND fpar.id IS NOT NULL
    )
),
casos_manuais AS (
  SELECT
    b.id
  FROM base_competencia_real b
  LEFT JOIN recebimentos_por_cobranca r
    ON r.cobranca_id = b.id
  WHERE b.origem_tipo = 'MATRICULA'
    AND COALESCE(r.qtd_recebimentos, 0) > 0
    AND EXISTS (
      SELECT 1
      FROM base_competencia_real par
      LEFT JOIN public.credito_conexao_faturas fpar
        ON fpar.cobranca_id = par.id
      WHERE par.pessoa_id = b.pessoa_id
        AND par.valor_centavos = b.valor_centavos
        AND par.origem_tipo = 'FATURA_CREDITO_CONEXAO'
        AND COALESCE(par.competencia_real, '') = COALESCE(b.competencia_real, '')
        AND fpar.id IS NOT NULL
    )
)
SELECT
  'A' AS bloco,
  'duplicidades_ativas_fatura_credito_conexao_por_origem_id' AS metrica,
  COUNT(*)::text AS valor_texto,
  COUNT(*)::bigint AS valor_numerico,
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'EXISTEM_DUPLICIDADES_CANONICAS' END AS detalhe
FROM duplicidade_canonica

UNION ALL

SELECT
  'B',
  'grupos_duplicados_ativos_por_pessoa_competencia_valor',
  COUNT(*)::text,
  COUNT(*)::bigint,
  'heuristica_original por pessoa + competencia_ano_mes + valor_centavos'
FROM grupos_raw

UNION ALL

SELECT
  'B',
  'cobrancas_envolvidas_na_heuristica_original',
  COALESCE(SUM(quantidade), 0)::text,
  COALESCE(SUM(quantidade), 0)::bigint,
  'cobrancas ainda capturadas pelo agrupamento original'
FROM grupos_raw

UNION ALL

SELECT
  'C',
  'indice_ux_cobrancas_fatura_credito_conexao_ativa_existe',
  CASE WHEN EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_cobrancas_fatura_credito_conexao_ativa'
  ) THEN 'SIM' ELSE 'NAO' END,
  CASE WHEN EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_cobrancas_fatura_credito_conexao_ativa'
  ) THEN 1 ELSE 0 END,
  'consistencia estrutural da protecao canonica'

UNION ALL

SELECT
  'D',
  'grupos_duplicados_por_competencia_real',
  COUNT(*)::text,
  COUNT(*)::bigint,
  'agrupamento por pessoa + competencia real (cobranca.competencia ou fatura.periodo)'
FROM grupos_competencia_real

UNION ALL

SELECT
  'D',
  'cobrancas_envolvidas_por_competencia_real',
  COALESCE(SUM(quantidade), 0)::text,
  COALESCE(SUM(quantidade), 0)::bigint,
  'passivo real ainda visivel quando a competencia da fatura e considerada'
FROM grupos_competencia_real

UNION ALL

SELECT
  'D',
  'ids_seguro_para_lote_final_nao_executado',
  COUNT(*)::text,
  COUNT(*)::bigint,
  'legado MATRICULA/CARTAO_CONEXAO sem recebimento e com par canonico'
FROM lote_seguro

UNION ALL

SELECT
  'D',
  'ids_em_revisao_manual_por_recebimento',
  COUNT(*)::text,
  COUNT(*)::bigint,
  'legado MATRICULA/CARTAO_CONEXAO com recebimento exige migracao ou decisao humana'
FROM casos_manuais

UNION ALL

SELECT
  'D',
  'tipos_remanescentes_por_competencia_real',
  COALESCE(STRING_AGG(DISTINCT origem_tipo, ', ' ORDER BY origem_tipo), 'nenhum'),
  COUNT(DISTINCT origem_tipo)::bigint,
  'origens ainda presentes nos grupos por competencia real'
FROM base_competencia_real
WHERE EXISTS (
  SELECT 1
  FROM grupos_competencia_real g
  WHERE g.pessoa_id = base_competencia_real.pessoa_id
    AND g.valor_centavos = base_competencia_real.valor_centavos
    AND g.competencia_real = base_competencia_real.competencia_real
);
