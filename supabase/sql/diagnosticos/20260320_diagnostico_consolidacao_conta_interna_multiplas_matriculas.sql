-- Objetivo:
-- diagnosticar casos em que a mesma conta interna / fatura interna
-- gera multiplas cobrancas ou multiplos itens com perda de vinculo de aluno.
-- Nao executar UPDATE/DELETE. Apenas SELECTs diagnosticos.

-- Query 1: cobrancas por conta interna e fatura interna em marco/2026
WITH cobrancas_base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.vencimento AS data_vencimento,
    c.valor_centavos,
    c.status
  FROM public.cobrancas c
  WHERE c.competencia_ano_mes = '2026-03'
    AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
),
lancamentos_base AS (
  SELECT
    l.id AS lancamento_id,
    l.cobranca_id,
    l.conta_conexao_id AS conta_interna_id,
    fl.fatura_id AS fatura_interna_id,
    l.aluno_id,
    l.matricula_id,
    l.referencia_item,
    l.descricao AS lancamento_descricao,
    l.valor_centavos AS lancamento_valor_centavos,
    l.composicao_json
  FROM public.credito_conexao_lancamentos l
  LEFT JOIN public.credito_conexao_fatura_lancamentos fl
    ON fl.lancamento_id = l.id
)
SELECT
  cb.cobranca_id,
  cb.pessoa_id,
  cb.competencia_ano_mes,
  cb.data_vencimento,
  cb.valor_centavos,
  cb.status,
  lb.conta_interna_id,
  lb.fatura_interna_id,
  lb.lancamento_id,
  lb.aluno_id,
  lb.matricula_id,
  lb.referencia_item,
  lb.lancamento_descricao,
  lb.lancamento_valor_centavos
FROM cobrancas_base cb
LEFT JOIN lancamentos_base lb
  ON lb.cobranca_id = cb.cobranca_id
ORDER BY cb.pessoa_id, lb.conta_interna_id, lb.fatura_interna_id, cb.data_vencimento, cb.cobranca_id, lb.lancamento_id;

-- Query 2: identificar faturas internas com mais de uma cobranca oficial
SELECT
  fl.fatura_id AS fatura_interna_id,
  COUNT(DISTINCT c.id) AS total_cobrancas_oficiais,
  SUM(c.valor_centavos) AS total_cobrancas_centavos
FROM public.cobrancas c
JOIN public.credito_conexao_lancamentos l
  ON l.cobranca_id = c.id
JOIN public.credito_conexao_fatura_lancamentos fl
  ON fl.lancamento_id = l.id
WHERE c.competencia_ano_mes = '2026-03'
  AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
GROUP BY fl.fatura_id
HAVING COUNT(DISTINCT c.id) > 1
ORDER BY fl.fatura_id;

-- Query 3: itens sem aluno identificado por aluno_id, matricula ou composicao_json
WITH itens_base AS (
  SELECT
    c.id AS cobranca_id,
    l.id AS lancamento_id,
    fl.fatura_id AS fatura_interna_id,
    l.conta_conexao_id AS conta_interna_id,
    l.aluno_id,
    l.matricula_id,
    l.referencia_item,
    l.descricao,
    l.valor_centavos,
    l.composicao_json,
    m.pessoa_id AS matricula_aluno_id,
    ta.aluno_pessoa_id AS turma_aluno_id,
    CASE
      WHEN COALESCE(l.composicao_json->>'aluno_pessoa_id', '') ~ '^\d+$'
        THEN (l.composicao_json->>'aluno_pessoa_id')::bigint
      ELSE NULL
    END AS composicao_aluno_id
  FROM public.cobrancas c
  JOIN public.credito_conexao_lancamentos l
    ON l.cobranca_id = c.id
  LEFT JOIN public.credito_conexao_fatura_lancamentos fl
    ON fl.lancamento_id = l.id
  LEFT JOIN public.matriculas m
    ON m.id = l.matricula_id
  LEFT JOIN public.turma_aluno ta
    ON ta.matricula_id = l.matricula_id
  WHERE c.competencia_ano_mes = '2026-03'
    AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
)
SELECT
  cobranca_id,
  lancamento_id,
  conta_interna_id,
  fatura_interna_id,
  aluno_id,
  matricula_id,
  matricula_aluno_id,
  turma_aluno_id,
  composicao_aluno_id,
  referencia_item,
  descricao,
  valor_centavos
FROM itens_base
WHERE COALESCE(aluno_id, matricula_aluno_id, turma_aluno_id, composicao_aluno_id) IS NULL
ORDER BY cobranca_id, lancamento_id;

-- Query 4: caso da conta interna #11 / responsavel do print
-- Ajustar filtros reais apos localizar IDs corretos no banco.
