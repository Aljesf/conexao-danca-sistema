CREATE TABLE IF NOT EXISTS public.financeiro_cobrancas_avulsas (
  id bigserial PRIMARY KEY,
  pessoa_id bigint NOT NULL,
  origem_tipo text NOT NULL,
  origem_id bigint NOT NULL,
  valor_centavos bigint NOT NULL CHECK (valor_centavos >= 0),
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','CANCELADO','VENCIDO')),
  meio text NOT NULL DEFAULT 'BOLETO' CHECK (meio IN ('BOLETO','FIMP','OUTRO')),
  motivo_excecao text NOT NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_fin_cobr_avulsas_pessoa ON public.financeiro_cobrancas_avulsas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_fin_cobr_avulsas_origem ON public.financeiro_cobrancas_avulsas(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_fin_cobr_avulsas_status ON public.financeiro_cobrancas_avulsas(status);
CREATE INDEX IF NOT EXISTS idx_fin_cobr_avulsas_venc ON public.financeiro_cobrancas_avulsas(vencimento);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.atualizado_em = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END$$;

DROP TRIGGER IF EXISTS set_updated_at_fin_cobr_avulsas ON public.financeiro_cobrancas_avulsas;
CREATE TRIGGER set_updated_at_fin_cobr_avulsas
BEFORE UPDATE ON public.financeiro_cobrancas_avulsas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
