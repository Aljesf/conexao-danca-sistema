-- Execucao manual futura de saneamento controlado de duplicidade de cobrancas
-- Escopo: apenas casos MATRICULA_X_FATURA
-- Fora de escopo: FATURA_DUPLA e TRIPLA_OU_MAIS
-- IDs elegiveis a cancelamento revisavel: 216, 258, 272, 285, 313, 412
-- Revisar manualmente antes de executar.

BEGIN;

UPDATE public.cobrancas
SET status = 'CANCELADA'
WHERE id IN (216, 258, 272, 285, 313, 412)
  AND origem_tipo = 'MATRICULA'
  AND status != 'CANCELADA';

-- COMMIT;
-- Executar somente apos revisao humana final dos IDs acima.
-- ROLLBACK;
