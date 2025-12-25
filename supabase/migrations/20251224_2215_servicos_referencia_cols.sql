BEGIN;

ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS referencia_tipo text;

ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS referencia_id bigint;

ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS titulo text;

COMMIT;
