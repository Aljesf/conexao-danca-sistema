BEGIN;

-- Ajuste: Esta tabela nao depende de formularios.
-- Ela define o "escopo" do Movimento: o que esta coberto para aquele beneficiario.

CREATE TABLE IF NOT EXISTS public.movimento_beneficiario_coberturas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.movimento_beneficiarios(id) ON DELETE CASCADE,

  -- Use um destes alvos conforme seu modelo real:
  -- 1) servico_id (ideal se voce tem catalogo de servicos/modalidades)
  -- 2) turma_id (ideal se a concessao e por turma especifica)
  servico_id       uuid NULL,
  turma_id         uuid NULL,

  ativo            boolean NOT NULL DEFAULT true,
  dt_inicio        date NOT NULL DEFAULT CURRENT_DATE,
  dt_fim           date NULL,

  observacoes      text NULL,

  criado_em        timestamptz NOT NULL DEFAULT now(),
  criado_por       uuid NULL,

  CONSTRAINT ck_mov_cobertura_alvo CHECK (
    (servico_id IS NOT NULL AND turma_id IS NULL)
    OR (servico_id IS NULL AND turma_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_mov_coberturas_beneficiario
  ON public.movimento_beneficiario_coberturas(beneficiario_id);

CREATE INDEX IF NOT EXISTS idx_mov_coberturas_servico
  ON public.movimento_beneficiario_coberturas(servico_id);

CREATE INDEX IF NOT EXISTS idx_mov_coberturas_turma
  ON public.movimento_beneficiario_coberturas(turma_id);

-- Evita duplicidade de cobertura ativa para o mesmo alvo
CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_cobertura_benef_servico_ativo
  ON public.movimento_beneficiario_coberturas(beneficiario_id, servico_id)
  WHERE ativo = true AND servico_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mov_cobertura_benef_turma_ativo
  ON public.movimento_beneficiario_coberturas(beneficiario_id, turma_id)
  WHERE ativo = true AND turma_id IS NOT NULL;

COMMIT;
