-- Adiciona numero_parcelas em credito_conexao_lancamentos
-- e valor_taxas_centavos em credito_conexao_faturas

ALTER TABLE public.credito_conexao_lancamentos
  ADD COLUMN IF NOT EXISTS numero_parcelas integer NULL;

ALTER TABLE public.credito_conexao_faturas
  ADD COLUMN IF NOT EXISTS valor_taxas_centavos integer NOT NULL DEFAULT 0;
