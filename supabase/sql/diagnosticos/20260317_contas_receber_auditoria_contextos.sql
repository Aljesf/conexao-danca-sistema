-- BLOCO A - cobrancas abertas/vencidas com nome real da pessoa
WITH base_cobrancas AS (
  SELECT
    v.cobranca_id,
    v.pessoa_id,
    COALESCE(NULLIF(TRIM(p.nome), ''), 'Pessoa #' || v.pessoa_id::text) AS pessoa_nome,
    v.vencimento,
    v.status_cobranca,
    v.situacao_saas,
    v.bucket_vencimento,
    v.valor_centavos,
    v.valor_recebido_centavos,
    v.saldo_aberto_centavos,
    v.competencia_ano_mes,
    v.dias_atraso,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.centro_custo_id,
    cc.codigo AS centro_custo_codigo,
    cc.nome AS centro_custo_nome
  FROM public.vw_financeiro_contas_receber_flat v
  LEFT JOIN public.cobrancas c
    ON c.id = v.cobranca_id
  LEFT JOIN public.pessoas p
    ON p.id = v.pessoa_id
  LEFT JOIN public.centros_custo cc
    ON cc.id = c.centro_custo_id
  WHERE COALESCE(v.saldo_aberto_centavos, 0) > 0
     OR UPPER(COALESCE(v.situacao_saas, '')) = 'VENCIDA'
)
SELECT *
FROM base_cobrancas
ORDER BY vencimento NULLS LAST, cobranca_id DESC;

-- BLOCO B - agregacao por devedor
WITH base_cobrancas AS (
  SELECT
    v.cobranca_id,
    v.pessoa_id,
    COALESCE(NULLIF(TRIM(p.nome), ''), 'Pessoa #' || v.pessoa_id::text) AS pessoa_nome,
    v.vencimento,
    v.saldo_aberto_centavos,
    v.dias_atraso,
    v.situacao_saas
  FROM public.vw_financeiro_contas_receber_flat v
  LEFT JOIN public.pessoas p
    ON p.id = v.pessoa_id
  WHERE COALESCE(v.saldo_aberto_centavos, 0) > 0
)
SELECT
  pessoa_id,
  pessoa_nome,
  SUM(CASE WHEN UPPER(COALESCE(situacao_saas, '')) = 'VENCIDA' THEN saldo_aberto_centavos ELSE 0 END) AS total_vencido_centavos,
  COUNT(*) FILTER (WHERE UPPER(COALESCE(situacao_saas, '')) = 'VENCIDA') AS titulos_vencidos,
  COALESCE(MAX(dias_atraso), 0) AS maior_atraso_dias,
  MIN(vencimento) FILTER (WHERE UPPER(COALESCE(situacao_saas, '')) = 'VENCIDA') AS vencimento_mais_antigo
FROM base_cobrancas
GROUP BY pessoa_id, pessoa_nome
HAVING SUM(CASE WHEN UPPER(COALESCE(situacao_saas, '')) = 'VENCIDA' THEN saldo_aberto_centavos ELSE 0 END) > 0
ORDER BY total_vencido_centavos DESC, maior_atraso_dias DESC, pessoa_nome;

-- BLOCO C - classificacao por contexto principal
WITH faturas AS (
  SELECT
    f.id,
    f.cobranca_id,
    f.conta_conexao_id,
    f.periodo_referencia
  FROM public.credito_conexao_faturas f
),
fatura_contexto AS (
  SELECT
    fl.fatura_id,
    ARRAY_AGG(DISTINCT UPPER(COALESCE(l.origem_sistema, ''))) FILTER (WHERE l.id IS NOT NULL) AS origens_sistema
  FROM public.credito_conexao_fatura_lancamentos fl
  INNER JOIN public.credito_conexao_lancamentos l
    ON l.id = fl.lancamento_id
  GROUP BY fl.fatura_id
),
base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.centro_custo_id,
    cc.codigo AS centro_custo_codigo,
    cc.nome AS centro_custo_nome,
    f.id AS fatura_id,
    fc.origens_sistema
  FROM public.cobrancas c
  LEFT JOIN public.centros_custo cc
    ON cc.id = c.centro_custo_id
  LEFT JOIN faturas f
    ON f.cobranca_id = c.id
       OR (UPPER(COALESCE(c.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO' AND f.id = c.origem_id)
  LEFT JOIN fatura_contexto fc
    ON fc.fatura_id = f.id
  WHERE UPPER(COALESCE(c.status, '')) <> 'CANCELADA'
)
SELECT
  cobranca_id,
  pessoa_id,
  origem_tipo,
  origem_subtipo,
  origem_id,
  centro_custo_id,
  centro_custo_codigo,
  centro_custo_nome,
  CASE
    WHEN UPPER(COALESCE(centro_custo_codigo, '')) = 'ESCOLA' OR UPPER(COALESCE(centro_custo_nome, '')) LIKE '%ESCOLA%' THEN 'ESCOLA'
    WHEN UPPER(COALESCE(centro_custo_codigo, '')) = 'CAFE' OR UPPER(COALESCE(centro_custo_nome, '')) LIKE '%CAFE%' THEN 'CAFE'
    WHEN UPPER(COALESCE(centro_custo_codigo, '')) = 'LOJA' OR UPPER(COALESCE(centro_custo_nome, '')) LIKE '%LOJA%' THEN 'LOJA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'MATRICULA' THEN 'ESCOLA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'CAFE' THEN 'CAFE'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'LOJA' THEN 'LOJA'
    WHEN ARRAY['MATRICULA', 'MATRICULA_REPROCESSAR'] <@ COALESCE(origens_sistema, ARRAY[]::text[]) THEN 'ESCOLA'
    WHEN ARRAY['CAFE'] <@ COALESCE(origens_sistema, ARRAY[]::text[]) THEN 'CAFE'
    WHEN ARRAY['LOJA'] <@ COALESCE(origens_sistema, ARRAY[]::text[]) THEN 'LOJA'
    ELSE 'OUTRO'
  END AS contexto_principal
FROM base
ORDER BY cobranca_id DESC;

-- BLOCO D - classificacao por origem detalhada
WITH faturas AS (
  SELECT
    f.id,
    f.cobranca_id,
    f.conta_conexao_id,
    f.periodo_referencia
  FROM public.credito_conexao_faturas f
),
contas AS (
  SELECT
    id,
    tipo_conta
  FROM public.credito_conexao_contas
),
fatura_itens AS (
  SELECT
    fl.fatura_id,
    ARRAY_AGG(DISTINCT UPPER(COALESCE(l.origem_sistema, ''))) FILTER (WHERE l.id IS NOT NULL) AS origens_sistema,
    ARRAY_AGG(DISTINCT UPPER(COALESCE(l.descricao, ''))) FILTER (WHERE l.id IS NOT NULL) AS descricoes
  FROM public.credito_conexao_fatura_lancamentos fl
  INNER JOIN public.credito_conexao_lancamentos l
    ON l.id = fl.lancamento_id
  GROUP BY fl.fatura_id
),
base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.origem_tipo,
    c.origem_subtipo,
    c.origem_id,
    c.descricao,
    m.id AS matricula_id,
    ta.turma_id,
    t.nome AS turma_nome,
    t.curso_livre_id,
    f.id AS fatura_id,
    conta.tipo_conta AS conta_conexao_tipo,
    fi.origens_sistema,
    fi.descricoes
  FROM public.cobrancas c
  LEFT JOIN public.matriculas m
    ON m.id = c.origem_id
   AND UPPER(COALESCE(c.origem_tipo, '')) = 'MATRICULA'
  LEFT JOIN public.turma_aluno ta
    ON ta.matricula_id = m.id
  LEFT JOIN public.turmas t
    ON t.turma_id = ta.turma_id
  LEFT JOIN faturas f
    ON f.cobranca_id = c.id
       OR (UPPER(COALESCE(c.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO' AND f.id = c.origem_id)
  LEFT JOIN contas conta
    ON conta.id = f.conta_conexao_id
  LEFT JOIN fatura_itens fi
    ON fi.fatura_id = f.id
  WHERE UPPER(COALESCE(c.status, '')) <> 'CANCELADA'
)
SELECT
  cobranca_id,
  pessoa_id,
  origem_tipo,
  origem_subtipo,
  origem_id,
  fatura_id,
  conta_conexao_tipo,
  CASE
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'MATRICULA' AND curso_livre_id IS NOT NULL THEN 'CURSO_LIVRE'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'MATRICULA' AND UPPER(COALESCE(descricao, '')) LIKE '%CURSO LIVRE%' THEN 'CURSO_LIVRE'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'MATRICULA' AND UPPER(COALESCE(descricao, '')) LIKE '%ESPETAC%' THEN 'INSCRICAO_ESPETACULO'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'MATRICULA' THEN 'MATRICULA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'CAFE' AND UPPER(COALESCE(origem_subtipo, '')) = 'CONTA_INTERNA_COLABORADOR' THEN 'CONTA_INTERNA_COLABORADOR'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'CAFE' AND (UPPER(COALESCE(origem_subtipo, '')) = 'CARTAO_CONEXAO' OR UPPER(COALESCE(conta_conexao_tipo, '')) = 'ALUNO') THEN 'CONTA_INTERNA_ALUNO'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'CAFE' THEN 'CONSUMO_CAFE'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'LOJA' AND UPPER(COALESCE(origem_subtipo, '')) LIKE '%CREDITO%' THEN 'CREDITO_INTERNO_LOJA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'LOJA' AND UPPER(COALESCE(origem_subtipo, '')) LIKE '%COMPLEMENTO%' THEN 'COMPLEMENTO_LOJA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'LOJA' THEN 'VENDA_LOJA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO'
         AND COALESCE(origens_sistema, ARRAY[]::text[]) <@ ARRAY['MATRICULA', 'MATRICULA_REPROCESSAR']::text[] THEN 'MATRICULA'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO'
         AND COALESCE(origens_sistema, ARRAY[]::text[]) <@ ARRAY['CAFE']::text[]
         AND UPPER(COALESCE(conta_conexao_tipo, '')) = 'COLABORADOR' THEN 'CONTA_INTERNA_COLABORADOR'
    WHEN UPPER(COALESCE(origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO'
         AND COALESCE(origens_sistema, ARRAY[]::text[]) <@ ARRAY['CAFE']::text[] THEN 'CONTA_INTERNA_ALUNO'
    ELSE 'ORIGEM_NAO_RESOLVIDA'
  END AS origem_detalhada
FROM base
ORDER BY cobranca_id DESC;

-- BLOCO E - composicao de fatura do Cartao Conexao
SELECT
  f.id AS fatura_id,
  f.cobranca_id,
  f.conta_conexao_id,
  f.periodo_referencia,
  f.data_vencimento,
  f.valor_total_centavos,
  l.id AS lancamento_id,
  l.descricao,
  l.valor_centavos,
  l.origem_sistema,
  l.origem_id,
  l.referencia_item,
  l.composicao_json
FROM public.credito_conexao_faturas f
INNER JOIN public.credito_conexao_fatura_lancamentos fl
  ON fl.fatura_id = f.id
INNER JOIN public.credito_conexao_lancamentos l
  ON l.id = fl.lancamento_id
ORDER BY f.periodo_referencia DESC, f.id DESC, l.id ASC;

-- BLOCO F - perdas por cancelamento de matricula
WITH matriculas_canceladas AS (
  SELECT
    m.id AS matricula_id,
    COALESCE(me.realizado_em::date, m.encerramento_em::date) AS data_cancelamento,
    TO_CHAR(COALESCE(me.realizado_em::date, m.encerramento_em::date), 'YYYY-MM') AS periodo,
    COALESCE(me.cobrancas_canceladas_valor_centavos, 0) AS valor_cancelado_centavos,
    COALESCE(m.total_mensalidade_centavos, 0) AS total_mensalidade_centavos
  FROM public.matriculas m
  LEFT JOIN LATERAL (
    SELECT
      me.realizado_em,
      me.cobrancas_canceladas_valor_centavos
    FROM public.matriculas_encerramentos me
    WHERE me.matricula_id = m.id
    ORDER BY me.realizado_em DESC NULLS LAST
    LIMIT 1
  ) me ON TRUE
  WHERE UPPER(COALESCE(m.status::text, '')) = 'CANCELADA'
),
cobrancas_abertas AS (
  SELECT
    v.origem_id AS matricula_id,
    SUM(v.saldo_aberto_centavos) AS valor_aberto_centavos
  FROM public.vw_financeiro_contas_receber_flat v
  WHERE UPPER(COALESCE(v.origem_tipo, '')) = 'MATRICULA'
    AND COALESCE(v.saldo_aberto_centavos, 0) > 0
  GROUP BY v.origem_id
)
SELECT
  mc.periodo,
  COUNT(*) AS quantidade_matriculas_canceladas,
  COALESCE(SUM(ca.valor_aberto_centavos), 0) AS valor_aberto_centavos,
  SUM(
    CASE
      WHEN mc.valor_cancelado_centavos > 0 THEN mc.valor_cancelado_centavos
      ELSE mc.total_mensalidade_centavos
    END
  ) AS valor_potencial_perdido_centavos
FROM matriculas_canceladas mc
LEFT JOIN cobrancas_abertas ca
  ON ca.matricula_id = mc.matricula_id
GROUP BY mc.periodo
ORDER BY mc.periodo DESC;
