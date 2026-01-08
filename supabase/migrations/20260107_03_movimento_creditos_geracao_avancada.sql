-- Movimento - Creditos (geracao avancada)
-- 2026-01-07

BEGIN;

DO $$ BEGIN
  CREATE TYPE movimento_lote_status AS ENUM ('ABERTO', 'FECHADO', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.movimento_regras_geracao
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid NULL,
  ADD COLUMN IF NOT EXISTS filtros jsonb NULL,
  ADD COLUMN IF NOT EXISTS observacoes text NULL;

CREATE TABLE IF NOT EXISTS public.movimento_regras_geracao_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id uuid NOT NULL REFERENCES public.movimento_regras_geracao(id) ON DELETE CASCADE,
  tipo_credito_gerado public.movimento_credito_tipo NOT NULL,
  percentual integer NOT NULL CHECK (percentual BETWEEN 0 AND 100),
  reais_por_credito_override numeric(14,2) NULL CHECK (reais_por_credito_override IS NULL OR reais_por_credito_override > 0),
  proposito_padrao text NULL,
  curso_id_destino uuid NULL,
  projeto_id_destino uuid NULL,
  filtros jsonb NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_regra_aloc_regra_id
  ON public.movimento_regras_geracao_alocacoes(regra_id);

CREATE TABLE IF NOT EXISTS public.movimento_creditos_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia text NOT NULL,
  origem public.movimento_credito_origem NOT NULL,
  regra_id uuid NULL REFERENCES public.movimento_regras_geracao(id) ON DELETE SET NULL,
  regra_alocacao_id uuid NULL REFERENCES public.movimento_regras_geracao_alocacoes(id) ON DELETE SET NULL,
  fonte_externa_id uuid NULL REFERENCES public.movimento_fontes_externas(id) ON DELETE SET NULL,
  tipo_credito public.movimento_credito_tipo NOT NULL,
  valor_base numeric(14,2) NULL CHECK (valor_base IS NULL OR valor_base >= 0),
  quantidade_total integer NOT NULL CHECK (quantidade_total >= 0),
  quantidade_alocada integer NOT NULL DEFAULT 0 CHECK (quantidade_alocada >= 0),
  proposito text NULL,
  curso_id_destino uuid NULL,
  projeto_id_destino uuid NULL,
  filtros jsonb NULL,
  status public.movimento_lote_status NOT NULL DEFAULT 'ABERTO',
  criado_em timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_lotes_comp_origem_ref_tipo_dest
  ON public.movimento_creditos_lotes(
    competencia,
    origem,
    COALESCE(regra_alocacao_id, regra_id, fonte_externa_id),
    tipo_credito,
    COALESCE(curso_id_destino::text,''),
    COALESCE(projeto_id_destino::text,'')
  );

CREATE OR REPLACE VIEW public.vw_movimento_saldo_lotes AS
SELECT
  competencia,
  tipo_credito,
  origem,
  SUM(quantidade_total) AS quantidade_total,
  SUM(quantidade_alocada) AS quantidade_alocada,
  (SUM(quantidade_total) - SUM(quantidade_alocada)) AS saldo_disponivel
FROM public.movimento_creditos_lotes
WHERE status = 'ABERTO'
GROUP BY competencia, tipo_credito, origem;

COMMIT;
