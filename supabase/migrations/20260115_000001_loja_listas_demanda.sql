-- Listas administrativas de demanda (nao e compra/fornecedor/estoque/financeiro)

-- 1) Enum de status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loja_lista_demanda_status') THEN
    CREATE TYPE public.loja_lista_demanda_status AS ENUM ('ATIVA', 'ENCERRADA');
  END IF;
END $$;

-- 2) Tabela de listas (cabecalho)
CREATE TABLE IF NOT EXISTS public.loja_listas_demanda (
  id            bigserial PRIMARY KEY,
  titulo        text NOT NULL,
  contexto      text NULL,
  status        public.loja_lista_demanda_status NOT NULL DEFAULT 'ATIVA',
  bloqueada     boolean NOT NULL DEFAULT false,
  observacoes   text NULL,

  criado_em     timestamptz NOT NULL DEFAULT now(),
  criado_por    uuid NULL,

  bloqueada_em  timestamptz NULL,
  bloqueada_por uuid NULL,

  encerrada_em  timestamptz NULL,
  encerrada_por uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_status
  ON public.loja_listas_demanda (status);

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_bloqueada
  ON public.loja_listas_demanda (bloqueada);

-- 3) Tabela de itens
CREATE TABLE IF NOT EXISTS public.loja_listas_demanda_itens (
  id                  bigserial PRIMARY KEY,
  lista_id            bigint NOT NULL REFERENCES public.loja_listas_demanda(id) ON DELETE CASCADE,

  produto_id          bigint NULL REFERENCES public.loja_produtos(id) ON DELETE SET NULL,
  produto_variacao_id bigint NULL,

  descricao_livre     text NULL,
  quantidade          integer NOT NULL CHECK (quantidade > 0),
  observacoes         text NULL,

  criado_em           timestamptz NOT NULL DEFAULT now(),
  criado_por          uuid NULL,
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_por      uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_itens_lista
  ON public.loja_listas_demanda_itens (lista_id);

CREATE INDEX IF NOT EXISTS idx_loja_listas_demanda_itens_produto
  ON public.loja_listas_demanda_itens (produto_id);

-- 4) FK condicional para variacoes (se existir tabela padrao)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name='loja_produto_variantes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema='public'
        AND table_name='loja_listas_demanda_itens'
        AND constraint_name='fk_loja_listas_demanda_itens_variacao'
    ) THEN
      ALTER TABLE public.loja_listas_demanda_itens
        ADD CONSTRAINT fk_loja_listas_demanda_itens_variacao
        FOREIGN KEY (produto_variacao_id) REFERENCES public.loja_produto_variantes(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 5) Regra: item precisa de produto OU descricao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='loja_listas_demanda_itens'
      AND constraint_name='chk_loja_lista_item_produto_ou_descricao'
  ) THEN
    ALTER TABLE public.loja_listas_demanda_itens
      ADD CONSTRAINT chk_loja_lista_item_produto_ou_descricao
      CHECK (
        (produto_id IS NOT NULL)
        OR (descricao_livre IS NOT NULL AND btrim(descricao_livre) <> '')
      );
  END IF;
END $$;
