-- Ajusta unicidade de CPF apenas para registros ativos e ignorando NULL.
-- Remova/ajuste a constraint existente que gera o erro "pessoas_cpf_ativo_uniq"
-- antes de criar o índice abaixo.

-- DROP INDEX IF EXISTS public.pessoas_cpf_ativo_uniq;
-- DROP INDEX IF EXISTS public.pessoas_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS pessoas_cpf_ativo_uniq
  ON public.pessoas (cpf)
  WHERE cpf IS NOT NULL AND ativo = true;

