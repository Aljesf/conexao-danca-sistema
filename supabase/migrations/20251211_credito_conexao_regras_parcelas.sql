-- ============================================
-- Tabela: credito_conexao_regras_parcelas
-- Regras de parcelamento do Cartao Conexao
-- ============================================

CREATE TABLE public.credito_conexao_regras_parcelas (
  id bigserial PRIMARY KEY,

  tipo_conta text NOT NULL,      -- 'ALUNO' ou 'COLABORADOR'
  numero_parcelas_min integer NOT NULL,
  numero_parcelas_max integer NOT NULL,
  valor_minimo_centavos integer NOT NULL DEFAULT 0,

  taxa_percentual numeric(8,3) NOT NULL DEFAULT 0, -- ex.: 3.500 = 3,5%
  taxa_fixa_centavos integer NOT NULL DEFAULT 0,

  centro_custo_id integer NULL,
  categoria_financeira_id integer NULL,

  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credito_conexao_regras_parcelas_tipo_conta_chk
    CHECK (tipo_conta IN ('ALUNO', 'COLABORADOR')),

  CONSTRAINT credito_conexao_regras_parcelas_parcelas_chk
    CHECK (numero_parcelas_min >= 1 AND numero_parcelas_max >= numero_parcelas_min),

  CONSTRAINT credito_conexao_regras_parcelas_cc_fk
    FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo (id),

  CONSTRAINT credito_conexao_regras_parcelas_cat_fk
    FOREIGN KEY (categoria_financeira_id) REFERENCES public.categorias_financeiras (id)
);

CREATE INDEX credito_conexao_regras_parcelas_tipo_conta_idx
  ON public.credito_conexao_regras_parcelas (tipo_conta);

CREATE INDEX credito_conexao_regras_parcelas_ativo_idx
  ON public.credito_conexao_regras_parcelas (ativo);
