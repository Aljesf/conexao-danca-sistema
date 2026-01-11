-- Objetivo:
-- 1) Identificar FKs que apontam para credito_conexao_faturas (seguranca antes de deletar)
-- 2) Apagar somente faturas que NAO possuem nenhum vinculo em credito_conexao_fatura_lancamentos

-- 0.1) Quais tabelas referenciam credito_conexao_faturas?
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'credito_conexao_faturas'
ORDER BY tc.table_name, tc.constraint_name;

-- 0.2) Quantas faturas SEM itens existem (por periodo)?
SELECT
  f.periodo_referencia,
  COUNT(*) AS total_sem_itens
FROM public.credito_conexao_faturas f
LEFT JOIN public.credito_conexao_fatura_lancamentos fl
  ON fl.fatura_id = f.id
GROUP BY f.periodo_referencia
HAVING COUNT(fl.lancamento_id) = 0
ORDER BY f.periodo_referencia DESC;

-- 0.3) Amostra das faturas SEM itens (para conferencia)
SELECT
  f.id,
  f.conta_conexao_id,
  f.periodo_referencia,
  f.valor_total_centavos,
  f.status,
  f.created_at
FROM public.credito_conexao_faturas f
LEFT JOIN public.credito_conexao_fatura_lancamentos fl
  ON fl.fatura_id = f.id
GROUP BY f.id
HAVING COUNT(fl.lancamento_id) = 0
ORDER BY f.created_at DESC
LIMIT 200;

-- 0.4) LIMPEZA (somente faturas SEM itens)
-- Regra pedida: "ficar somente com as faturas que tem algum lancamento vinculado".
-- Portanto: deletar TODAS as faturas onde NAO existe vinculo na tabela de relacao.
BEGIN;

WITH alvo AS (
  SELECT f.id
  FROM public.credito_conexao_faturas f
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.credito_conexao_fatura_lancamentos fl
    WHERE fl.fatura_id = f.id
  )
)
DELETE FROM public.credito_conexao_faturas f
USING alvo
WHERE f.id = alvo.id
RETURNING f.id, f.conta_conexao_id, f.periodo_referencia, f.valor_total_centavos, f.status, f.created_at;

-- Se estiver tudo certo, COMMIT.
COMMIT;

-- Se quiser simular antes, troque o DELETE por SELECT COUNT(*) do CTE alvo.
