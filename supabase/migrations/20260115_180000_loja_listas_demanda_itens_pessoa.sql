BEGIN;

ALTER TABLE public.loja_listas_demanda_itens
ADD COLUMN IF NOT EXISTS pessoa_id bigint NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loja_listas_demanda_itens_pessoa_id_fkey'
  ) THEN
    ALTER TABLE public.loja_listas_demanda_itens
      ADD CONSTRAINT loja_listas_demanda_itens_pessoa_id_fkey
      FOREIGN KEY (pessoa_id)
      REFERENCES public.pessoas (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_itens_pessoa
ON public.loja_listas_demanda_itens (pessoa_id);

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_itens_prod_var
ON public.loja_listas_demanda_itens (produto_id, produto_variacao_id);

COMMIT;
