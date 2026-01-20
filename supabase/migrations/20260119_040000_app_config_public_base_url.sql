BEGIN;

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed (somente se ainda nao existir)
INSERT INTO public.app_config (key, value)
VALUES ('public_base_url', 'https://conexaodanca.art.br')
ON CONFLICT (key) DO NOTHING;

COMMIT;
