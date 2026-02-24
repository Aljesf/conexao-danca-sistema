-- NIVEL CODEX: HIGH
-- Alteracao grande detectada. Recomendo backup.
--
-- 1) BACKUP AUTOMATICO (obrigatorio) - execute no terminal ANTES:
-- git add .
-- git commit -m "Backup automatico antes de reset cartao (credito conexao + cartao credito + neofin)"
-- git tag -a backup-$(date +'%Y-%m-%d-%H-%M') -m "Backup automatico antes de reset cartao (credito conexao + cartao credito + neofin)"

-- ========================================================
-- ETAPA 1 - SQL (RESET CONTROLADO)
-- Executar no Supabase SQL Editor (PRODUCTION/DEV conforme seu ambiente).
-- ========================================================

-- [INICIO DO BLOCO] Supabase SQL Editor (query unica) (linha 1)
BEGIN;
------------------------------------------------------------
-- A) CREDITO CONEXAO (Cartao Conexao) - zerar testes
-- Mantem: credito_conexao_contas
------------------------------------------------------------

DELETE FROM public.credito_conexao_fatura_lancamentos;
DELETE FROM public.credito_conexao_faturas;
DELETE FROM public.credito_conexao_lancamentos;
------------------------------------------------------------
-- B) LOJA (somente vendas vinculadas ao Cartao Conexao)
-- Se voce testou o Cartao Conexao pela Loja, isso limpa as vendas de teste.
------------------------------------------------------------

-- 1) Remover itens das vendas que tinham conta_conexao_id
DELETE FROM public.loja_venda_itens i
USING public.loja_vendas v
WHERE i.venda_id = v.id
  AND v.conta_conexao_id IS NOT NULL;
-- 2) Remover cabecalhos dessas vendas
DELETE FROM public.loja_vendas
WHERE conta_conexao_id IS NOT NULL;
------------------------------------------------------------
-- C) CARTAO DE CREDITO (maquininhas/recebiveis) - zerar testes
------------------------------------------------------------

-- 1) Recebiveis de cartao (tabela propria)
DELETE FROM public.cartao_recebiveis;
-- 2) Recebimentos com metadados de cartao (somente os que tem cartao_*)
DELETE FROM public.recebimentos
WHERE cartao_maquina_id IS NOT NULL
   OR cartao_bandeira_id IS NOT NULL
   OR cartao_numero_parcelas IS NOT NULL;
-- 3) Pagamentos de contas a pagar com metadados de cartao (somente os que tem cartao_*)
DELETE FROM public.contas_pagar_pagamentos
WHERE cartao_maquina_id IS NOT NULL
   OR cartao_bandeira_id IS NOT NULL
   OR cartao_numero_parcelas IS NOT NULL;
------------------------------------------------------------
-- D) COBRANCAS NEOFIM / NEOFIM (apenas as do contexto do cartao)
-- Remove tambem recebimentos atrelados, para nao sobrar FK.
------------------------------------------------------------

WITH alvo AS (
  SELECT c.id
  FROM public.cobrancas c
  WHERE
    (c.neofin_charge_id IS NOT NULL OR c.neofin_payload IS NOT NULL OR c.link_pagamento IS NOT NULL OR c.linha_digitavel IS NOT NULL)
    AND
    (
      c.origem_tipo ILIKE '%CREDITO_CONEXAO%'
      OR c.origem_tipo ILIKE '%CARTAO_CONEXAO%'
      OR c.origem_tipo ILIKE '%NEOFIN%'
    )
)
DELETE FROM public.recebimentos r
USING alvo a
WHERE r.cobranca_id = a.id;
WITH alvo AS (
  SELECT c.id
  FROM public.cobrancas c
  WHERE
    (c.neofin_charge_id IS NOT NULL OR c.neofin_payload IS NOT NULL OR c.link_pagamento IS NOT NULL OR c.linha_digitavel IS NOT NULL)
    AND
    (
      c.origem_tipo ILIKE '%CREDITO_CONEXAO%'
      OR c.origem_tipo ILIKE '%CARTAO_CONEXAO%'
      OR c.origem_tipo ILIKE '%NEOFIN%'
    )
)
DELETE FROM public.cobrancas c
USING alvo a
WHERE c.id = a.id;
------------------------------------------------------------
-- E) GARANTIAS DE INTEGRIDADE PARA O MODULO (indices)
------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_credito_conexao_faturas_conta_periodo'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX ux_credito_conexao_faturas_conta_periodo
      ON public.credito_conexao_faturas (conta_conexao_id, periodo_referencia)
    ';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ix_credito_conexao_faturas_periodo'
  ) THEN
    EXECUTE '
      CREATE INDEX ix_credito_conexao_faturas_periodo
      ON public.credito_conexao_faturas (periodo_referencia)
    ';
  END IF;
END$$;
COMMIT;
-- ========================================================
-- CHECK (rapido no SQL Editor)
-- ========================================================
-- Deve retornar 0:
-- SELECT COUNT(*) FROM public.credito_conexao_faturas;
-- SELECT COUNT(*) FROM public.credito_conexao_lancamentos;
-- SELECT COUNT(*) FROM public.credito_conexao_fatura_lancamentos;
--
-- Deve retornar 0 (se voce so testou cartao):
-- SELECT COUNT(*) FROM public.cartao_recebiveis;;
