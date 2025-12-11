-- Ajuste de limites em credito_conexao_contas:
-- - renomear limite_credito_centavos -> limite_maximo_centavos
-- - adicionar limite_autorizado_centavos

ALTER TABLE public.credito_conexao_contas
  RENAME COLUMN limite_credito_centavos TO limite_maximo_centavos;

ALTER TABLE public.credito_conexao_contas
  ADD COLUMN limite_autorizado_centavos integer NULL;
