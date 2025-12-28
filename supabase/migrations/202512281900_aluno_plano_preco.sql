BEGIN;

-- Tabela: vinculo do aluno (pessoa) -> plano (politica)
CREATE TABLE IF NOT EXISTS public.financeiro_aluno_planos_preco (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL,
  politica_id BIGINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  manual BOOLEAN NOT NULL DEFAULT false,
  motivo TEXT NULL,
  justificativa TEXT NULL,
  definida_por UUID NULL,
  definida_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_aluno_planos_preco_pessoa_fk') THEN
    ALTER TABLE public.financeiro_aluno_planos_preco
      ADD CONSTRAINT financeiro_aluno_planos_preco_pessoa_fk
      FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_aluno_planos_preco_politica_fk') THEN
    ALTER TABLE public.financeiro_aluno_planos_preco
      ADD CONSTRAINT financeiro_aluno_planos_preco_politica_fk
      FOREIGN KEY (politica_id) REFERENCES public.financeiro_politicas_preco(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_aluno_plano_ativo
  ON public.financeiro_aluno_planos_preco (pessoa_id, politica_id)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_fin_aluno_plano_pessoa
  ON public.financeiro_aluno_planos_preco (pessoa_id, ativo);

CREATE INDEX IF NOT EXISTS idx_fin_aluno_plano_politica
  ON public.financeiro_aluno_planos_preco (politica_id, ativo);

-- Remover legado: politica padrao por item
DROP TABLE IF EXISTS public.financeiro_politicas_preco_padrao;

COMMIT;
