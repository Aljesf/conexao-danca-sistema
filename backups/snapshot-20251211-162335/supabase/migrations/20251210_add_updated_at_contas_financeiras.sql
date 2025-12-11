-- Adiciona coluna updated_at em contas_financeiras

ALTER TABLE public.contas_financeiras
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
