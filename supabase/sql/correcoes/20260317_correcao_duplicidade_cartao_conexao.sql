-- Protege a cobranca canonica da fatura do Cartao Conexao.
-- Cada fatura deve ter no maximo uma cobranca ativa com origem canônica.

DO $$
DECLARE
  v_duplicidades integer;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicidades
  FROM (
    SELECT c.origem_id
    FROM public.cobrancas c
    WHERE c.origem_tipo = 'FATURA_CREDITO_CONEXAO'
      AND c.status <> 'CANCELADA'
    GROUP BY c.origem_id
    HAVING COUNT(*) > 1
  ) duplicadas;

  IF v_duplicidades > 0 THEN
    RAISE NOTICE 'Indice unico parcial nao criado: ainda existem duplicidades canonicas de FATURA_CREDITO_CONEXAO.';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_cobrancas_fatura_credito_conexao_ativa'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX ux_cobrancas_fatura_credito_conexao_ativa
      ON public.cobrancas (origem_tipo, origem_id)
      WHERE origem_tipo = ''FATURA_CREDITO_CONEXAO''
        AND status <> ''CANCELADA''
    ';
  END IF;
END $$;
