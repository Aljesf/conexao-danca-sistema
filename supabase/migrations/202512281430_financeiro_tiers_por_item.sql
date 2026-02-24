BEGIN;
-- Vincular tiers a tabela de preco + item (ajuste por item)
ALTER TABLE public.financeiro_tiers
  ADD COLUMN IF NOT EXISTS tabela_id bigint NULL,
  ADD COLUMN IF NOT EXISTS tabela_item_id bigint NULL,
  ADD COLUMN IF NOT EXISTS ajuste_tipo text NULL,
  ADD COLUMN IF NOT EXISTS ajuste_valor_centavos integer NULL;
-- CHECK basico para ajuste_tipo (texto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'financeiro_tiers_ajuste_tipo_chk'
  ) THEN
    ALTER TABLE public.financeiro_tiers
      ADD CONSTRAINT financeiro_tiers_ajuste_tipo_chk
      CHECK (ajuste_tipo IS NULL OR ajuste_tipo IN ('override','percentual','fixo'));
  END IF;
END $$;
-- FKs para tabela e item (ajuste conforme schema real)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_tiers_tabela_fk'
  ) THEN
    ALTER TABLE public.financeiro_tiers
      ADD CONSTRAINT financeiro_tiers_tabela_fk
      FOREIGN KEY (tabela_id) REFERENCES public.matricula_tabelas(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_tiers_tabela_item_fk'
  ) THEN
    ALTER TABLE public.financeiro_tiers
      ADD CONSTRAINT financeiro_tiers_tabela_item_fk
      FOREIGN KEY (tabela_item_id) REFERENCES public.matricula_tabela_itens(id)
      ON DELETE RESTRICT;
  END IF;
END $$;
-- Migracao do valor_centavos existente para ajuste (override)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='financeiro_tiers'
      AND column_name='valor_centavos'
  ) THEN
    UPDATE public.financeiro_tiers
      SET ajuste_tipo = COALESCE(ajuste_tipo, 'override'),
          ajuste_valor_centavos = COALESCE(ajuste_valor_centavos, valor_centavos)
    WHERE valor_centavos IS NOT NULL;
  END IF;
END $$;
-- Indice para o resolver
CREATE INDEX IF NOT EXISTS idx_financeiro_tiers_lookup
  ON public.financeiro_tiers (tabela_id, tabela_item_id, ativo, ordem);
COMMIT;
