-- Adiciona fornecedor_principal_id em loja_produtos,
-- permitindo vincular um fornecedor padrao (loja_fornecedores).

ALTER TABLE public.loja_produtos
ADD COLUMN IF NOT EXISTS fornecedor_principal_id bigint;

-- Cria FK apenas se ainda nao existir (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loja_produtos_fornecedor_principal_fk'
  ) THEN
    ALTER TABLE public.loja_produtos
      ADD CONSTRAINT loja_produtos_fornecedor_principal_fk
      FOREIGN KEY (fornecedor_principal_id)
      REFERENCES public.loja_fornecedores(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- Indice para consultas por fornecedor principal.
CREATE INDEX IF NOT EXISTS idx_loja_produtos_fornecedor_principal
  ON public.loja_produtos (fornecedor_principal_id);

COMMENT ON COLUMN public.loja_produtos.fornecedor_principal_id IS
  'Fornecedor principal do produto (opcional). Liga com public.loja_fornecedores(id).';
