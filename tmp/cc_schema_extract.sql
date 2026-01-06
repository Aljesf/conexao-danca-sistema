CREATE TABLE public."cobrancas" (
  "id" bigint NOT NULL DEFAULT nextval('cobrancas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "descricao" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "vencimento" date NOT NULL,
  "data_pagamento" date,
  "status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "metodo_pagamento" text,
  "neofin_charge_id" text,
  "neofin_payload" jsonb,
  "link_pagamento" text,
  "linha_digitavel" text,
  "observacoes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "centro_custo_id" integer,
  "origem_tipo" text,
  "origem_id" bigint,
  "parcela_numero" smallint,
  "total_parcelas" smallint,
  "origem_subtipo" text,
  "competencia_ano_mes" text,
  "data_prevista_pagamento" date,
  "data_inicio_encargos" date,
  "multa_percentual_aplicavel" numeric,
  "juros_mora_percentual_mensal_aplicavel" numeric
);

CREATE TABLE public."credito_conexao_fatura_lancamentos" (
  "fatura_id" bigint NOT NULL,
  "lancamento_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."credito_conexao_faturas" (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_faturas_id_seq'::regclass),
  "conta_conexao_id" bigint NOT NULL,
  "periodo_referencia" text NOT NULL,
  "data_fechamento" date NOT NULL,
  "data_vencimento" date,
  "valor_total_centavos" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'ABERTA'::text,
  "cobranca_id" bigint,
  "neofin_invoice_id" text,
  "folha_pagamento_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "valor_taxas_centavos" integer NOT NULL DEFAULT 0
);

CREATE TABLE public."credito_conexao_lancamentos" (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_lancamentos_id_seq'::regclass),
  "conta_conexao_id" bigint NOT NULL,
  "origem_sistema" text NOT NULL,
  "origem_id" bigint,
  "descricao" text,
  "valor_centavos" integer NOT NULL,
  "data_lancamento" date NOT NULL DEFAULT CURRENT_DATE,
  "status" text NOT NULL DEFAULT 'PENDENTE_FATURA'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "numero_parcelas" integer
);

