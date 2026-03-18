ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS expurgada boolean DEFAULT false;

ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS expurgada_em timestamptz;

ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS expurgada_por uuid;

ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS expurgo_motivo text;

CREATE INDEX IF NOT EXISTS idx_cobrancas_expurgada
ON public.cobrancas(expurgada);
