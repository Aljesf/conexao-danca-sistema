BEGIN;

CREATE OR REPLACE VIEW public.vw_financeiro_cobrancas_inconsistentes AS
SELECT
  f.cobranca_id,
  f.pessoa_id,
  f.vencimento,
  f.dias_atraso,
  f.saldo_aberto_centavos,
  f.status_cobranca,
  f.origem_tipo,
  f.origem_id
FROM public.vw_financeiro_contas_receber_flat f
WHERE f.saldo_aberto_centavos > 0
  AND upper(coalesce(f.status_cobranca,'')) = 'CANCELADA';

COMMENT ON VIEW public.vw_financeiro_cobrancas_inconsistentes IS
'Cobrancas com saldo aberto mas status CANCELADA (dado/fluxo inconsistente).';

COMMIT;
