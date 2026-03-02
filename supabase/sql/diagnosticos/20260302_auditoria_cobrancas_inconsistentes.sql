-- Objetivo:
-- Encontrar cobranças com status de pago/quitado mas ainda com saldo em aberto,
-- que causam divergência entre:
-- - régua SaaS (saldo_aberto + vencimento)
-- - resumo financeiro (filtra por status ABERTA/PENDENTE/EM_ABERTO/OPEN)

-- 1) Lista inconsistências
select
  f.cobranca_id,
  f.pessoa_id,
  p.nome as pessoa_nome,
  f.data_vencimento,
  f.dias_atraso,
  f.saldo_aberto_centavos,
  (f.saldo_aberto_centavos/100.0) as saldo_aberto_reais,
  f.status_cobranca,
  f.origem_tipo,
  f.origem_id
from public.vw_financeiro_contas_receber_flat f
left join public.pessoas p on p.id = f.pessoa_id
where upper(coalesce(f.status_cobranca,'')) in ('PAGO','PAGA','QUITADA','LIQUIDADA')
  and f.saldo_aberto_centavos > 0
order by f.dias_atraso desc nulls last
limit 200;

-- 2) (opcional) Se você decidir normalizar status para ABERTA quando saldo_aberto > 0,
-- use com EXTREMA cautela e rode primeiro em poucas linhas:
-- update public.cobrancas c
-- set status = 'ABERTA'
-- where c.id in (
--   select f.cobranca_id
--   from public.vw_financeiro_contas_receber_flat f
--   where upper(coalesce(f.status_cobranca,'')) in ('PAGO','PAGA','QUITADA','LIQUIDADA')
--     and f.saldo_aberto_centavos > 0
-- );
