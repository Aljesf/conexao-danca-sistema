-- Lote final proposto para saneamento controlado.
-- Este arquivo contempla apenas cobrancas legado `MATRICULA/CARTAO_CONEXAO`
-- sem recebimentos, com par canonico `FATURA_CREDITO_CONEXAO` para a mesma competencia real.
-- Nao foi executado nesta etapa porque ainda existem 13 casos com recebimento que exigem decisao humana.
--
-- IDs propostos para cancelamento seguro:
-- 50, 51, 72, 73, 116, 117, 127, 149, 160, 172, 193, 217, 261, 338

BEGIN;

UPDATE public.cobrancas
SET status = 'CANCELADA'
WHERE id IN (50, 51, 72, 73, 116, 117, 127, 149, 160, 172, 193, 217, 261, 338)
  AND origem_tipo = 'MATRICULA'
  AND origem_subtipo = 'CARTAO_CONEXAO'
  AND status != 'CANCELADA';

-- COMMIT;
-- ROLLBACK;
