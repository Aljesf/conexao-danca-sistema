# Recorte do Schema - Credito Conexao

Fonte: `schema-supabase.sql` (snapshot atualizado)

## Blocos SQL extraidos

```sql
-- Tabela: public."credito_conexao_faturas"
-- --------------------------------------------------
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

-- --------------------------------------------------
```
```sql
-- Tabela: public."credito_conexao_lancamentos"
-- --------------------------------------------------
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

-- --------------------------------------------------
```
```sql
-- Tabela: public."credito_conexao_fatura_lancamentos"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_fatura_lancamentos" (
  "fatura_id" bigint NOT NULL,
  "lancamento_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
```
```sql
-- Tabela: public."credito_conexao_regras_parcelas"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_regras_parcelas" (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_regras_parcelas_id_seq'::regclass),
  "tipo_conta" text NOT NULL,
  "numero_parcelas_min" integer NOT NULL,
  "numero_parcelas_max" integer NOT NULL,
  "valor_minimo_centavos" integer NOT NULL DEFAULT 0,
  "taxa_percentual" numeric NOT NULL DEFAULT 0,
  "taxa_fixa_centavos" integer NOT NULL DEFAULT 0,
  "centro_custo_id" integer,
  "categoria_financeira_id" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
```
