-- Auditoria previa da cobranca canonica da fatura do Cartao Conexao.
SELECT
  c.origem_id,
  COUNT(*) AS quantidade,
  ARRAY_AGG(c.id ORDER BY c.id) AS cobrancas_ids
FROM public.cobrancas c
WHERE c.origem_tipo = 'FATURA_CREDITO_CONEXAO'
  AND c.status <> 'CANCELADA'
GROUP BY c.origem_id
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, c.origem_id ASC;
