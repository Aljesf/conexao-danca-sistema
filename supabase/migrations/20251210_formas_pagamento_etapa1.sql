-- Tabela de dicionário global de formas de pagamento
CREATE TABLE public.formas_pagamento (
  id bigserial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo_base text NOT NULL, -- ex.: DINHEIRO, PIX, CARTAO, CREDIARIO, CARTEIRA_INTERNA, OUTRO
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de mapeamento de formas de pagamento por centro de custo/contexto
CREATE TABLE public.formas_pagamento_contexto (
  id bigserial PRIMARY KEY,
  centro_custo_id integer NOT NULL REFERENCES centros_custo(id),
  forma_pagamento_codigo text NOT NULL REFERENCES formas_pagamento(codigo),
  descricao_exibicao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem_exibicao integer NOT NULL DEFAULT 0,
  conta_financeira_id bigint NULL REFERENCES contas_financeiras(id),
  cartao_maquina_id bigint NULL REFERENCES cartao_maquinas(id),
  carteira_tipo text NULL, -- ex.: 'COLABORADOR', 'ALUNO' para crediário/carteira interna
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT formas_pagamento_contexto_unq UNIQUE (centro_custo_id, forma_pagamento_codigo)
);

CREATE INDEX formas_pagamento_contexto_centro_idx
  ON public.formas_pagamento_contexto (centro_custo_id);

CREATE INDEX formas_pagamento_contexto_forma_idx
  ON public.formas_pagamento_contexto (forma_pagamento_codigo);

-- Seed inicial de formas de pagamento globais
INSERT INTO public.formas_pagamento (codigo, nome, tipo_base, ativo)
VALUES
  ('DINHEIRO',         'Dinheiro',                      'DINHEIRO',         true),
  ('PIX',              'PIX',                           'PIX',              true),
  ('CREDITO_AVISTA',   'Cartao de credito a vista',     'CARTAO',           true),
  ('CREDITO_PARCELADO','Cartao de credito parcelado',   'CARTAO',           true),
  ('CREDIARIO_COLAB',  'Crediario colaborador',         'CREDIARIO',        true),
  ('CREDITO_ALUNO',    'Credito interno aluno',         'CARTEIRA_INTERNA', true)
ON CONFLICT (codigo) DO NOTHING;
