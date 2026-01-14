ALTER TABLE public.financeiro_cobrancas_avulsas
  ADD COLUMN IF NOT EXISTS valor_pago_centavos bigint,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS comprovante text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fin_cobr_avulsas_forma_pagamento_check') THEN
    ALTER TABLE public.financeiro_cobrancas_avulsas
      ADD CONSTRAINT fin_cobr_avulsas_forma_pagamento_check
      CHECK (
        forma_pagamento IS NULL OR
        forma_pagamento IN (
          'PIX',
          'DINHEIRO',
          'CARTAO_CREDITO_AVISTA',
          'CARTAO_CREDITO_PARCELADO',
          'CARTAO_CONEXAO_ALUNO',
          'CARTAO_CONEXAO_COLABORADOR',
          'CREDITO_INTERNO_ALUNO',
          'CREDIARIO_COLABORADOR',
          'OUTRO'
        )
      );
  END IF;
END$$;
