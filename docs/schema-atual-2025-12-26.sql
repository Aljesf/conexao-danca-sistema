-- Snapshot do schema gerado em 2025-12-26T12:26:55.755Z
-- Fonte: SUPABASE_DB_URL

-- --------------------------------------------------
-- Tabela: public.alunos
-- --------------------------------------------------
CREATE TABLE public.alunos (
  "id" bigint NOT NULL DEFAULT nextval('alunos_id_seq'::regclass),
  "nome" text NOT NULL,
  "email" text,
  "telefone" text,
  "data_nascimento" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id" uuid DEFAULT auth.uid(),
  "user_email" text
);

-- Constraints
ALTER TABLE public.alunos ADD CONSTRAINT alunos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX alunos_email_key ON public.alunos USING btree (email) WHERE (email IS NOT NULL);
CREATE UNIQUE INDEX alunos_pkey ON public.alunos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.alunos_turmas
-- --------------------------------------------------
CREATE TABLE public.alunos_turmas (
  "id" bigint NOT NULL DEFAULT nextval('alunos_turmas_id_seq'::regclass),
  "aluno_id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "dt_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "dt_fim" date,
  "situacao" text NOT NULL DEFAULT 'ativo'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id" uuid,
  "user_email" text
);

-- Constraints
ALTER TABLE public.alunos_turmas ADD CONSTRAINT alunos_turmas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;
ALTER TABLE public.alunos_turmas ADD CONSTRAINT alunos_turmas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.alunos_turmas ADD CONSTRAINT alunos_turmas_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX alunos_turmas_pkey ON public.alunos_turmas USING btree (id);

-- --------------------------------------------------
-- Tabela: public.auditoria_logs
-- --------------------------------------------------
CREATE TABLE public.auditoria_logs (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "acao" text NOT NULL,
  "entidade" text,
  "entidade_id" text,
  "detalhes" jsonb,
  "ip" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.auditoria_logs ADD CONSTRAINT auditoria_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id);
ALTER TABLE public.auditoria_logs ADD CONSTRAINT auditoria_logs_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX auditoria_logs_pkey ON public.auditoria_logs USING btree (id);
CREATE INDEX auditoria_logs_user_created_at_idx ON public.auditoria_logs USING btree (user_id, created_at DESC);

-- --------------------------------------------------
-- Tabela: public.avaliacao_aluno_resultado
-- --------------------------------------------------
CREATE TABLE public.avaliacao_aluno_resultado (
  "id" bigint NOT NULL DEFAULT nextval('avaliacao_aluno_resultado_id_seq'::regclass),
  "turma_avaliacao_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "conceito_final_id" bigint,
  "conceitos_por_grupo" jsonb,
  "observacoes_professor" text,
  "data_avaliacao" date NOT NULL,
  "avaliador_id" bigint,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES colaboradores(id);
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_conceito_final_id_fkey FOREIGN KEY (conceito_final_id) REFERENCES avaliacoes_conceitos(id);
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE;
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_turma_avaliacao_id_fkey FOREIGN KEY (turma_avaliacao_id) REFERENCES turma_avaliacoes(id) ON DELETE CASCADE;
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacao_aluno_resultado ADD CONSTRAINT avaliacao_aluno_resultado_unique UNIQUE (turma_avaliacao_id, pessoa_id);

-- Indexes
CREATE UNIQUE INDEX avaliacao_aluno_resultado_pkey ON public.avaliacao_aluno_resultado USING btree (id);
CREATE UNIQUE INDEX avaliacao_aluno_resultado_unique ON public.avaliacao_aluno_resultado USING btree (turma_avaliacao_id, pessoa_id);

-- --------------------------------------------------
-- Tabela: public.avaliacoes_conceitos
-- --------------------------------------------------
CREATE TABLE public.avaliacoes_conceitos (
  "id" bigint NOT NULL DEFAULT nextval('avaliacoes_conceitos_id_seq'::regclass),
  "codigo" text NOT NULL,
  "rotulo" text NOT NULL,
  "descricao" text,
  "ordem" integer NOT NULL DEFAULT 1,
  "cor_hex" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.avaliacoes_conceitos ADD CONSTRAINT avaliacoes_conceitos_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes_conceitos ADD CONSTRAINT avaliacoes_conceitos_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX avaliacoes_conceitos_codigo_key ON public.avaliacoes_conceitos USING btree (codigo);
CREATE UNIQUE INDEX avaliacoes_conceitos_pkey ON public.avaliacoes_conceitos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.avaliacoes_modelo
-- --------------------------------------------------
CREATE TABLE public.avaliacoes_modelo (
  "id" bigint NOT NULL DEFAULT nextval('avaliacoes_modelo_id_seq'::regclass),
  "nome" text NOT NULL,
  "descricao" text,
  "tipo_avaliacao" tipo_avaliacao_enum NOT NULL,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "grupos" jsonb NOT NULL,
  "conceitos_ids" bigint[] NOT NULL DEFAULT '{}'::bigint[],
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.avaliacoes_modelo ADD CONSTRAINT avaliacoes_modelo_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX avaliacoes_modelo_pkey ON public.avaliacoes_modelo USING btree (id);

-- --------------------------------------------------
-- Tabela: public.bairros
-- --------------------------------------------------
CREATE TABLE public.bairros (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "nome" text NOT NULL,
  "cidade" text,
  "estado" text,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.bairros ADD CONSTRAINT bairros_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX bairros_pkey ON public.bairros USING btree (id);

-- --------------------------------------------------
-- Tabela: public.cartao_bandeiras
-- --------------------------------------------------
CREATE TABLE public.cartao_bandeiras (
  "id" bigint NOT NULL DEFAULT nextval('cartao_bandeiras_id_seq'::regclass),
  "nome" text NOT NULL,
  "codigo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.cartao_bandeiras ADD CONSTRAINT cartao_bandeiras_pkey PRIMARY KEY (id);
ALTER TABLE public.cartao_bandeiras ADD CONSTRAINT cartao_bandeiras_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX cartao_bandeiras_codigo_key ON public.cartao_bandeiras USING btree (codigo);
CREATE UNIQUE INDEX cartao_bandeiras_pkey ON public.cartao_bandeiras USING btree (id);

-- --------------------------------------------------
-- Tabela: public.cartao_maquinas
-- --------------------------------------------------
CREATE TABLE public.cartao_maquinas (
  "id" bigint NOT NULL DEFAULT nextval('cartao_maquinas_id_seq'::regclass),
  "nome" text NOT NULL,
  "operadora" text,
  "conta_financeira_id" bigint NOT NULL,
  "centro_custo_id" integer NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.cartao_maquinas ADD CONSTRAINT cartao_maquinas_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.cartao_maquinas ADD CONSTRAINT cartao_maquinas_conta_financeira_id_fkey FOREIGN KEY (conta_financeira_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.cartao_maquinas ADD CONSTRAINT cartao_maquinas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX cartao_maquinas_centro_idx ON public.cartao_maquinas USING btree (centro_custo_id);
CREATE INDEX cartao_maquinas_conta_idx ON public.cartao_maquinas USING btree (conta_financeira_id);
CREATE UNIQUE INDEX cartao_maquinas_pkey ON public.cartao_maquinas USING btree (id);

-- --------------------------------------------------
-- Tabela: public.cartao_recebiveis
-- --------------------------------------------------
CREATE TABLE public.cartao_recebiveis (
  "id" bigint NOT NULL DEFAULT nextval('cartao_recebiveis_id_seq'::regclass),
  "venda_id" bigint NOT NULL,
  "maquina_id" bigint NOT NULL,
  "bandeira_id" bigint NOT NULL,
  "conta_financeira_id" bigint NOT NULL,
  "valor_bruto_centavos" integer NOT NULL,
  "taxa_operadora_centavos" integer NOT NULL DEFAULT 0,
  "valor_liquido_centavos" integer NOT NULL,
  "numero_parcelas" integer NOT NULL DEFAULT 1,
  "data_prevista_pagamento" date NOT NULL,
  "status" text NOT NULL DEFAULT 'PREVISTO'::text,
  "data_pagamento_real" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.cartao_recebiveis ADD CONSTRAINT cartao_recebiveis_bandeira_id_fkey FOREIGN KEY (bandeira_id) REFERENCES cartao_bandeiras(id);
ALTER TABLE public.cartao_recebiveis ADD CONSTRAINT cartao_recebiveis_conta_financeira_id_fkey FOREIGN KEY (conta_financeira_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.cartao_recebiveis ADD CONSTRAINT cartao_recebiveis_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES cartao_maquinas(id);
ALTER TABLE public.cartao_recebiveis ADD CONSTRAINT cartao_recebiveis_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES loja_vendas(id);
ALTER TABLE public.cartao_recebiveis ADD CONSTRAINT cartao_recebiveis_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX cartao_recebiveis_pkey ON public.cartao_recebiveis USING btree (id);
CREATE INDEX cartao_recebiveis_status_data_idx ON public.cartao_recebiveis USING btree (status, data_prevista_pagamento);
CREATE INDEX cartao_recebiveis_venda_idx ON public.cartao_recebiveis USING btree (venda_id);

-- --------------------------------------------------
-- Tabela: public.cartao_regras_operacao
-- --------------------------------------------------
CREATE TABLE public.cartao_regras_operacao (
  "id" bigint NOT NULL DEFAULT nextval('cartao_regras_operacao_id_seq'::regclass),
  "maquina_id" bigint NOT NULL,
  "bandeira_id" bigint NOT NULL,
  "tipo_transacao" text NOT NULL,
  "prazo_recebimento_dias" integer NOT NULL DEFAULT 30,
  "taxa_percentual" numeric(6,3) NOT NULL DEFAULT 0,
  "taxa_fixa_centavos" integer NOT NULL DEFAULT 0,
  "permitir_parcelado" boolean NOT NULL DEFAULT true,
  "max_parcelas" integer NOT NULL DEFAULT 12,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.cartao_regras_operacao ADD CONSTRAINT cartao_regras_operacao_bandeira_id_fkey FOREIGN KEY (bandeira_id) REFERENCES cartao_bandeiras(id);
ALTER TABLE public.cartao_regras_operacao ADD CONSTRAINT cartao_regras_operacao_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES cartao_maquinas(id);
ALTER TABLE public.cartao_regras_operacao ADD CONSTRAINT cartao_regras_operacao_pkey PRIMARY KEY (id);
ALTER TABLE public.cartao_regras_operacao ADD CONSTRAINT cartao_regras_operacao_unq UNIQUE (maquina_id, bandeira_id, tipo_transacao);

-- Indexes
CREATE INDEX cartao_regras_operacao_maquina_idx ON public.cartao_regras_operacao USING btree (maquina_id);
CREATE UNIQUE INDEX cartao_regras_operacao_pkey ON public.cartao_regras_operacao USING btree (id);
CREATE UNIQUE INDEX cartao_regras_operacao_unq ON public.cartao_regras_operacao USING btree (maquina_id, bandeira_id, tipo_transacao);

-- --------------------------------------------------
-- Tabela: public.categorias_financeiras
-- --------------------------------------------------
CREATE TABLE public.categorias_financeiras (
  "id" integer NOT NULL DEFAULT nextval('categorias_financeiras_id_seq'::regclass),
  "tipo" text NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "plano_conta_id" integer
);

-- Constraints
ALTER TABLE public.categorias_financeiras ADD CONSTRAINT categorias_financeiras_plano_conta_id_fkey FOREIGN KEY (plano_conta_id) REFERENCES plano_contas(id);
ALTER TABLE public.categorias_financeiras ADD CONSTRAINT categorias_financeiras_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX categorias_financeiras_pkey ON public.categorias_financeiras USING btree (id);

-- --------------------------------------------------
-- Tabela: public.centros_custo
-- --------------------------------------------------
CREATE TABLE public.centros_custo (
  "id" integer NOT NULL DEFAULT nextval('centros_custo_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.centros_custo ADD CONSTRAINT centros_custo_pkey PRIMARY KEY (id);
ALTER TABLE public.centros_custo ADD CONSTRAINT centros_custo_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX centros_custo_codigo_key ON public.centros_custo USING btree (codigo);
CREATE UNIQUE INDEX centros_custo_pkey ON public.centros_custo USING btree (id);

-- --------------------------------------------------
-- Tabela: public.cobrancas
-- --------------------------------------------------
CREATE TABLE public.cobrancas (
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
  "multa_percentual_aplicavel" numeric(5,2),
  "juros_mora_percentual_mensal_aplicavel" numeric(5,2)
);

-- Constraints
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_datas_acordo_chk CHECK (((data_inicio_encargos IS NULL) OR (data_prevista_pagamento IS NULL) OR (data_inicio_encargos >= data_prevista_pagamento)));
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_juros_aplicavel_chk CHECK (((juros_mora_percentual_mensal_aplicavel IS NULL) OR ((juros_mora_percentual_mensal_aplicavel >= (0)::numeric) AND (juros_mora_percentual_mensal_aplicavel <= 10.00))));
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_multa_aplicavel_chk CHECK (((multa_percentual_aplicavel IS NULL) OR ((multa_percentual_aplicavel >= (0)::numeric) AND (multa_percentual_aplicavel <= 2.00))));
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_parcela_chk CHECK ((((parcela_numero IS NULL) AND (total_parcelas IS NULL)) OR ((parcela_numero IS NOT NULL) AND (total_parcelas IS NOT NULL) AND (parcela_numero >= 0) AND (total_parcelas >= 1) AND (parcela_numero <= total_parcelas))));
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT;
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX cobrancas_origem_idx ON public.cobrancas USING btree (origem_tipo, origem_id);
CREATE INDEX cobrancas_parcelas_idx ON public.cobrancas USING btree (origem_tipo, origem_id, total_parcelas, parcela_numero);
CREATE INDEX cobrancas_pessoa_id_idx ON public.cobrancas USING btree (pessoa_id);
CREATE UNIQUE INDEX cobrancas_pkey ON public.cobrancas USING btree (id);
CREATE INDEX cobrancas_status_idx ON public.cobrancas USING btree (status);
CREATE INDEX cobrancas_vencimento_idx ON public.cobrancas USING btree (vencimento);
CREATE INDEX idx_cobrancas_created_at ON public.cobrancas USING btree (created_at);
CREATE INDEX idx_cobrancas_data_inicio_encargos ON public.cobrancas USING btree (data_inicio_encargos);
CREATE INDEX idx_cobrancas_data_prevista_pagamento ON public.cobrancas USING btree (data_prevista_pagamento);
CREATE INDEX idx_cobrancas_neofin_charge_id ON public.cobrancas USING btree (neofin_charge_id) WHERE (neofin_charge_id IS NOT NULL);
CREATE INDEX idx_cobrancas_status_vencimento ON public.cobrancas USING btree (status, vencimento);

-- --------------------------------------------------
-- Tabela: public.colaborador_funcoes
-- --------------------------------------------------
CREATE TABLE public.colaborador_funcoes (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_funcoes_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "funcao_id" integer NOT NULL,
  "principal" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.colaborador_funcoes ADD CONSTRAINT colaborador_funcoes_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE public.colaborador_funcoes ADD CONSTRAINT colaborador_funcoes_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES funcoes_colaborador(id);
ALTER TABLE public.colaborador_funcoes ADD CONSTRAINT colaborador_funcoes_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX colaborador_funcoes_pkey ON public.colaborador_funcoes USING btree (id);
CREATE INDEX idx_colab_funcoes_colab ON public.colaborador_funcoes USING btree (colaborador_id);
CREATE INDEX idx_colab_funcoes_funcao ON public.colaborador_funcoes USING btree (funcao_id);

-- --------------------------------------------------
-- Tabela: public.colaborador_jornada
-- --------------------------------------------------
CREATE TABLE public.colaborador_jornada (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_jornada_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "tipo_vinculo_id" integer,
  "inicio_vigencia" date NOT NULL,
  "fim_vigencia" date,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.colaborador_jornada ADD CONSTRAINT colaborador_jornada_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE public.colaborador_jornada ADD CONSTRAINT colaborador_jornada_tipo_vinculo_id_fkey FOREIGN KEY (tipo_vinculo_id) REFERENCES tipos_vinculo_colaborador(id);
ALTER TABLE public.colaborador_jornada ADD CONSTRAINT colaborador_jornada_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX colaborador_jornada_pkey ON public.colaborador_jornada USING btree (id);
CREATE INDEX idx_jornada_colab ON public.colaborador_jornada USING btree (colaborador_id);
CREATE INDEX idx_jornada_vigencia ON public.colaborador_jornada USING btree (inicio_vigencia, fim_vigencia);

-- --------------------------------------------------
-- Tabela: public.colaborador_jornada_dias
-- --------------------------------------------------
CREATE TABLE public.colaborador_jornada_dias (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_jornada_dias_id_seq'::regclass),
  "jornada_id" bigint NOT NULL,
  "dia_semana" text NOT NULL,
  "entrada_1" time without time zone,
  "saida_1" time without time zone,
  "entrada_2" time without time zone,
  "saida_2" time without time zone,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.colaborador_jornada_dias ADD CONSTRAINT colaborador_jornada_dias_jornada_id_fkey FOREIGN KEY (jornada_id) REFERENCES colaborador_jornada(id) ON DELETE CASCADE;
ALTER TABLE public.colaborador_jornada_dias ADD CONSTRAINT colaborador_jornada_dias_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX colaborador_jornada_dias_pkey ON public.colaborador_jornada_dias USING btree (id);
CREATE INDEX idx_jornada_dias_dia ON public.colaborador_jornada_dias USING btree (dia_semana);
CREATE INDEX idx_jornada_dias_jornada ON public.colaborador_jornada_dias USING btree (jornada_id);

-- --------------------------------------------------
-- Tabela: public.colaboradores
-- --------------------------------------------------
CREATE TABLE public.colaboradores (
  "id" bigint NOT NULL DEFAULT nextval('colaboradores_id_seq'::regclass),
  "pessoa_id" integer NOT NULL,
  "centro_custo_id" integer,
  "tipo_vinculo" text,
  "data_inicio" date,
  "data_fim" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "tipo_vinculo_id" integer
);

-- Constraints
ALTER TABLE public.colaboradores ADD CONSTRAINT colaboradores_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.colaboradores ADD CONSTRAINT colaboradores_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.colaboradores ADD CONSTRAINT colaboradores_tipo_vinculo_id_fkey FOREIGN KEY (tipo_vinculo_id) REFERENCES tipos_vinculo_colaborador(id);
ALTER TABLE public.colaboradores ADD CONSTRAINT colaboradores_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX colaboradores_pkey ON public.colaboradores USING btree (id);
CREATE INDEX idx_colaboradores_centro ON public.colaboradores USING btree (centro_custo_id);
CREATE INDEX idx_colaboradores_pessoa ON public.colaboradores USING btree (pessoa_id);

-- --------------------------------------------------
-- Tabela: public.config_pagamento_colaborador
-- --------------------------------------------------
CREATE TABLE public.config_pagamento_colaborador (
  "id" bigint NOT NULL DEFAULT nextval('config_pagamento_colaborador_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "funcao_id" integer,
  "modelo_pagamento_id" integer NOT NULL,
  "valor_centavos" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text
);

-- Constraints
ALTER TABLE public.config_pagamento_colaborador ADD CONSTRAINT config_pagamento_colaborador_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE public.config_pagamento_colaborador ADD CONSTRAINT config_pagamento_colaborador_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES funcoes_colaborador(id);
ALTER TABLE public.config_pagamento_colaborador ADD CONSTRAINT config_pagamento_colaborador_modelo_pagamento_id_fkey FOREIGN KEY (modelo_pagamento_id) REFERENCES modelos_pagamento_colaborador(id);
ALTER TABLE public.config_pagamento_colaborador ADD CONSTRAINT config_pagamento_colaborador_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX config_pagamento_colaborador_pkey ON public.config_pagamento_colaborador USING btree (id);
CREATE INDEX idx_conf_pag_colab ON public.config_pagamento_colaborador USING btree (colaborador_id);
CREATE INDEX idx_conf_pag_modelo ON public.config_pagamento_colaborador USING btree (modelo_pagamento_id);

-- --------------------------------------------------
-- Tabela: public.contas_financeiras
-- --------------------------------------------------
CREATE TABLE public.contas_financeiras (
  "id" bigint NOT NULL DEFAULT nextval('contas_financeiras_id_seq'::regclass),
  "centro_custo_id" integer,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "banco" text,
  "agencia" text,
  "numero_conta" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.contas_financeiras ADD CONSTRAINT contas_financeiras_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.contas_financeiras ADD CONSTRAINT contas_financeiras_pkey PRIMARY KEY (id);
ALTER TABLE public.contas_financeiras ADD CONSTRAINT contas_financeiras_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX contas_financeiras_codigo_key ON public.contas_financeiras USING btree (codigo);
CREATE UNIQUE INDEX contas_financeiras_pkey ON public.contas_financeiras USING btree (id);

-- --------------------------------------------------
-- Tabela: public.contas_pagar
-- --------------------------------------------------
CREATE TABLE public.contas_pagar (
  "id" bigint NOT NULL DEFAULT nextval('contas_pagar_id_seq'::regclass),
  "centro_custo_id" integer NOT NULL,
  "categoria_id" integer,
  "pessoa_id" integer,
  "descricao" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "vencimento" date NOT NULL,
  "data_pagamento" date,
  "status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "metodo_pagamento" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id);
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX contas_pagar_pkey ON public.contas_pagar USING btree (id);

-- --------------------------------------------------
-- Tabela: public.contas_pagar_pagamentos
-- --------------------------------------------------
CREATE TABLE public.contas_pagar_pagamentos (
  "id" bigint NOT NULL DEFAULT nextval('contas_pagar_pagamentos_id_seq'::regclass),
  "conta_pagar_id" bigint NOT NULL,
  "centro_custo_id" integer NOT NULL,
  "conta_financeira_id" integer,
  "valor_principal_centavos" integer NOT NULL,
  "juros_centavos" integer NOT NULL DEFAULT 0,
  "desconto_centavos" integer NOT NULL DEFAULT 0,
  "data_pagamento" date NOT NULL,
  "metodo_pagamento" text,
  "observacoes" text,
  "usuario_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "forma_pagamento_codigo" text,
  "cartao_maquina_id" bigint,
  "cartao_bandeira_id" bigint,
  "cartao_numero_parcelas" integer
);

-- Constraints
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_cartao_bandeira_id_fkey FOREIGN KEY (cartao_bandeira_id) REFERENCES cartao_bandeiras(id);
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_cartao_maquina_id_fkey FOREIGN KEY (cartao_maquina_id) REFERENCES cartao_maquinas(id);
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_conta_financeira_id_fkey FOREIGN KEY (conta_financeira_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_conta_pagar_id_fkey FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE;
ALTER TABLE public.contas_pagar_pagamentos ADD CONSTRAINT contas_pagar_pagamentos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX contas_pagar_pagamentos_pkey ON public.contas_pagar_pagamentos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.credito_conexao_contas
-- --------------------------------------------------
CREATE TABLE public.credito_conexao_contas (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_contas_id_seq'::regclass),
  "pessoa_titular_id" bigint NOT NULL,
  "tipo_conta" text NOT NULL,
  "descricao_exibicao" text,
  "dia_fechamento" integer NOT NULL DEFAULT 10,
  "dia_vencimento" integer,
  "centro_custo_principal_id" integer,
  "conta_financeira_origem_id" bigint,
  "conta_financeira_destino_id" bigint,
  "limite_maximo_centavos" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "limite_autorizado_centavos" integer,
  "centro_custo_intermediacao_id" integer,
  "categoria_taxas_id" integer
);

-- Constraints
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_tipo_conta_chk CHECK ((tipo_conta = ANY (ARRAY['ALUNO'::text, 'COLABORADOR'::text])));
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_centro_custo_fkey FOREIGN KEY (centro_custo_principal_id) REFERENCES centros_custo(id);
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_conta_financeira_destino_fkey FOREIGN KEY (conta_financeira_destino_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_conta_financeira_origem_fkey FOREIGN KEY (conta_financeira_origem_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_pessoa_titular_fkey FOREIGN KEY (pessoa_titular_id) REFERENCES pessoas(id);
ALTER TABLE public.credito_conexao_contas ADD CONSTRAINT credito_conexao_contas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX credito_conexao_contas_ativo_idx ON public.credito_conexao_contas USING btree (ativo);
CREATE INDEX credito_conexao_contas_pessoa_idx ON public.credito_conexao_contas USING btree (pessoa_titular_id);
CREATE UNIQUE INDEX credito_conexao_contas_pkey ON public.credito_conexao_contas USING btree (id);
CREATE INDEX credito_conexao_contas_tipo_conta_idx ON public.credito_conexao_contas USING btree (tipo_conta);
CREATE INDEX idx_credito_conexao_contas_cc_inter ON public.credito_conexao_contas USING btree (centro_custo_intermediacao_id);

-- --------------------------------------------------
-- Tabela: public.credito_conexao_fatura_lancamentos
-- --------------------------------------------------
CREATE TABLE public.credito_conexao_fatura_lancamentos (
  "fatura_id" bigint NOT NULL,
  "lancamento_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.credito_conexao_fatura_lancamentos ADD CONSTRAINT credito_conexao_fatura_lancamentos_fatura_fkey FOREIGN KEY (fatura_id) REFERENCES credito_conexao_faturas(id) ON DELETE CASCADE;
ALTER TABLE public.credito_conexao_fatura_lancamentos ADD CONSTRAINT credito_conexao_fatura_lancamentos_lancamento_fkey FOREIGN KEY (lancamento_id) REFERENCES credito_conexao_lancamentos(id);
ALTER TABLE public.credito_conexao_fatura_lancamentos ADD CONSTRAINT credito_conexao_fatura_lancamentos_pkey PRIMARY KEY (fatura_id, lancamento_id);

-- Indexes
CREATE UNIQUE INDEX credito_conexao_fatura_lancamentos_lancamento_uniq ON public.credito_conexao_fatura_lancamentos USING btree (lancamento_id);
CREATE UNIQUE INDEX credito_conexao_fatura_lancamentos_pkey ON public.credito_conexao_fatura_lancamentos USING btree (fatura_id, lancamento_id);

-- --------------------------------------------------
-- Tabela: public.credito_conexao_faturas
-- --------------------------------------------------
CREATE TABLE public.credito_conexao_faturas (
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

-- Constraints
ALTER TABLE public.credito_conexao_faturas ADD CONSTRAINT credito_conexao_faturas_status_chk CHECK ((status = ANY (ARRAY['ABERTA'::text, 'PAGA'::text, 'EM_ATRASO'::text, 'CANCELADA'::text])));
ALTER TABLE public.credito_conexao_faturas ADD CONSTRAINT credito_conexao_faturas_cobranca_fkey FOREIGN KEY (cobranca_id) REFERENCES cobrancas(id);
ALTER TABLE public.credito_conexao_faturas ADD CONSTRAINT credito_conexao_faturas_conta_fkey FOREIGN KEY (conta_conexao_id) REFERENCES credito_conexao_contas(id);
ALTER TABLE public.credito_conexao_faturas ADD CONSTRAINT credito_conexao_faturas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX credito_conexao_faturas_conta_idx ON public.credito_conexao_faturas USING btree (conta_conexao_id);
CREATE UNIQUE INDEX credito_conexao_faturas_pkey ON public.credito_conexao_faturas USING btree (id);
CREATE INDEX credito_conexao_faturas_status_idx ON public.credito_conexao_faturas USING btree (status);
CREATE INDEX credito_conexao_faturas_vencimento_idx ON public.credito_conexao_faturas USING btree (data_vencimento);
CREATE INDEX ix_credito_conexao_faturas_periodo ON public.credito_conexao_faturas USING btree (periodo_referencia);
CREATE UNIQUE INDEX ux_credito_conexao_faturas_conta_periodo ON public.credito_conexao_faturas USING btree (conta_conexao_id, periodo_referencia);

-- --------------------------------------------------
-- Tabela: public.credito_conexao_lancamentos
-- --------------------------------------------------
CREATE TABLE public.credito_conexao_lancamentos (
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

-- Constraints
ALTER TABLE public.credito_conexao_lancamentos ADD CONSTRAINT credito_conexao_lancamentos_status_chk CHECK ((status = ANY (ARRAY['PENDENTE_FATURA'::text, 'FATURADO'::text, 'CANCELADO'::text])));
ALTER TABLE public.credito_conexao_lancamentos ADD CONSTRAINT credito_conexao_lancamentos_conta_fkey FOREIGN KEY (conta_conexao_id) REFERENCES credito_conexao_contas(id) ON DELETE CASCADE;
ALTER TABLE public.credito_conexao_lancamentos ADD CONSTRAINT credito_conexao_lancamentos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX credito_conexao_lancamentos_conta_idx ON public.credito_conexao_lancamentos USING btree (conta_conexao_id);
CREATE INDEX credito_conexao_lancamentos_data_idx ON public.credito_conexao_lancamentos USING btree (data_lancamento);
CREATE UNIQUE INDEX credito_conexao_lancamentos_pkey ON public.credito_conexao_lancamentos USING btree (id);
CREATE INDEX credito_conexao_lancamentos_status_idx ON public.credito_conexao_lancamentos USING btree (status);

-- --------------------------------------------------
-- Tabela: public.credito_conexao_regras_parcelas
-- --------------------------------------------------
CREATE TABLE public.credito_conexao_regras_parcelas (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_regras_parcelas_id_seq'::regclass),
  "tipo_conta" text NOT NULL,
  "numero_parcelas_min" integer NOT NULL,
  "numero_parcelas_max" integer NOT NULL,
  "valor_minimo_centavos" integer NOT NULL DEFAULT 0,
  "taxa_percentual" numeric(8,3) NOT NULL DEFAULT 0,
  "taxa_fixa_centavos" integer NOT NULL DEFAULT 0,
  "centro_custo_id" integer,
  "categoria_financeira_id" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.credito_conexao_regras_parcelas ADD CONSTRAINT credito_conexao_regras_parcelas_parcelas_chk CHECK (((numero_parcelas_min >= 1) AND (numero_parcelas_max >= numero_parcelas_min)));
ALTER TABLE public.credito_conexao_regras_parcelas ADD CONSTRAINT credito_conexao_regras_parcelas_tipo_conta_chk CHECK ((tipo_conta = ANY (ARRAY['ALUNO'::text, 'COLABORADOR'::text])));
ALTER TABLE public.credito_conexao_regras_parcelas ADD CONSTRAINT credito_conexao_regras_parcelas_cat_fk FOREIGN KEY (categoria_financeira_id) REFERENCES categorias_financeiras(id);
ALTER TABLE public.credito_conexao_regras_parcelas ADD CONSTRAINT credito_conexao_regras_parcelas_cc_fk FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.credito_conexao_regras_parcelas ADD CONSTRAINT credito_conexao_regras_parcelas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX credito_conexao_regras_parcelas_ativo_idx ON public.credito_conexao_regras_parcelas USING btree (ativo);
CREATE UNIQUE INDEX credito_conexao_regras_parcelas_pkey ON public.credito_conexao_regras_parcelas USING btree (id);
CREATE INDEX credito_conexao_regras_parcelas_tipo_conta_idx ON public.credito_conexao_regras_parcelas USING btree (tipo_conta);

-- --------------------------------------------------
-- Tabela: public.cursos
-- --------------------------------------------------
CREATE TABLE public.cursos (
  "id" bigint NOT NULL DEFAULT nextval('cursos_id_seq'::regclass),
  "nome" text NOT NULL,
  "metodologia" text,
  "situacao" text NOT NULL DEFAULT 'Ativo'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.cursos ADD CONSTRAINT cursos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX cursos_pkey ON public.cursos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.endereco
-- --------------------------------------------------
CREATE TABLE public.endereco (
  "endereco_id" bigint NOT NULL DEFAULT nextval('endereco_endereco_id_seq'::regclass),
  "logradouro" text,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "cidade" text,
  "uf" text,
  "cep" text
);

-- Constraints
ALTER TABLE public.endereco ADD CONSTRAINT endereco_pkey PRIMARY KEY (endereco_id);

-- Indexes
CREATE UNIQUE INDEX endereco_pkey ON public.endereco USING btree (endereco_id);

-- --------------------------------------------------
-- Tabela: public.enderecos
-- --------------------------------------------------
CREATE TABLE public.enderecos (
  "id" bigint NOT NULL DEFAULT nextval('enderecos_id_seq'::regclass),
  "logradouro" text NOT NULL,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "cidade" text NOT NULL,
  "uf" character(2) NOT NULL,
  "cep" text,
  "referencia" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- Constraints
ALTER TABLE public.enderecos ADD CONSTRAINT enderecos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX enderecos_pkey ON public.enderecos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.enderecos_pessoa
-- --------------------------------------------------
CREATE TABLE public.enderecos_pessoa (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "pessoa_id" bigint,
  "rua_id" uuid,
  "bairro_id" uuid,
  "logradouro" text,
  "bairro" text,
  "cidade" text,
  "estado" text,
  "cep" text,
  "numero" text,
  "complemento" text,
  "referencia" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.enderecos_pessoa ADD CONSTRAINT enderecos_pessoa_bairro_id_fkey FOREIGN KEY (bairro_id) REFERENCES bairros(id);
ALTER TABLE public.enderecos_pessoa ADD CONSTRAINT enderecos_pessoa_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.enderecos_pessoa ADD CONSTRAINT enderecos_pessoa_rua_id_fkey FOREIGN KEY (rua_id) REFERENCES ruas(id);
ALTER TABLE public.enderecos_pessoa ADD CONSTRAINT enderecos_pessoa_pkey PRIMARY KEY (id);
ALTER TABLE public.enderecos_pessoa ADD CONSTRAINT enderecos_pessoa_pessoa_id_key UNIQUE (pessoa_id);

-- Indexes
CREATE UNIQUE INDEX enderecos_pessoa_pessoa_id_key ON public.enderecos_pessoa USING btree (pessoa_id);
CREATE UNIQUE INDEX enderecos_pessoa_pkey ON public.enderecos_pessoa USING btree (id);

-- --------------------------------------------------
-- Tabela: public.espacos
-- --------------------------------------------------
CREATE TABLE public.espacos (
  "id" bigint NOT NULL DEFAULT nextval('espacos_id_seq'::regclass),
  "local_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'SALA'::text,
  "capacidade" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.espacos ADD CONSTRAINT espacos_local_id_fkey FOREIGN KEY (local_id) REFERENCES locais(id) ON DELETE RESTRICT;
ALTER TABLE public.espacos ADD CONSTRAINT espacos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX espacos_local_id_idx ON public.espacos USING btree (local_id);
CREATE UNIQUE INDEX espacos_local_nome_uniq ON public.espacos USING btree (local_id, lower(nome));
CREATE UNIQUE INDEX espacos_pkey ON public.espacos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.financeiro_analises_gpt
-- --------------------------------------------------
CREATE TABLE public.financeiro_analises_gpt (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_analises_gpt_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now(),
  "snapshot_id" bigint,
  "model" text,
  "alertas" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "texto_curto" text,
  "raw" jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Constraints
ALTER TABLE public.financeiro_analises_gpt ADD CONSTRAINT financeiro_analises_gpt_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES financeiro_snapshots(id) ON DELETE CASCADE;
ALTER TABLE public.financeiro_analises_gpt ADD CONSTRAINT financeiro_analises_gpt_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX financeiro_analises_gpt_pkey ON public.financeiro_analises_gpt USING btree (id);
CREATE INDEX idx_financeiro_analises_gpt_created_at ON public.financeiro_analises_gpt USING btree (created_at);
CREATE INDEX idx_financeiro_analises_gpt_snapshot ON public.financeiro_analises_gpt USING btree (snapshot_id);

-- --------------------------------------------------
-- Tabela: public.financeiro_snapshots
-- --------------------------------------------------
CREATE TABLE public.financeiro_snapshots (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_snapshots_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now(),
  "data_base" date NOT NULL,
  "periodo_inicio" date NOT NULL,
  "periodo_fim" date NOT NULL,
  "centro_custo_id" bigint,
  "caixa_hoje_centavos" bigint NOT NULL DEFAULT 0,
  "entradas_previstas_30d_centavos" bigint NOT NULL DEFAULT 0,
  "saidas_comprometidas_30d_centavos" bigint NOT NULL DEFAULT 0,
  "folego_caixa_dias" numeric,
  "tendencia" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "resumo_por_centro" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "serie_fluxo_caixa" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "regras_alerta" jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Constraints
ALTER TABLE public.financeiro_snapshots ADD CONSTRAINT financeiro_snapshots_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX financeiro_snapshots_pkey ON public.financeiro_snapshots USING btree (id);
CREATE INDEX idx_financeiro_snapshots_centro_data ON public.financeiro_snapshots USING btree (centro_custo_id, data_base);
CREATE INDEX idx_financeiro_snapshots_data_base ON public.financeiro_snapshots USING btree (data_base);

-- --------------------------------------------------
-- Tabela: public.formas_pagamento
-- --------------------------------------------------
CREATE TABLE public.formas_pagamento (
  "id" bigint NOT NULL DEFAULT nextval('formas_pagamento_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo_base" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.formas_pagamento ADD CONSTRAINT formas_pagamento_pkey PRIMARY KEY (id);
ALTER TABLE public.formas_pagamento ADD CONSTRAINT formas_pagamento_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX formas_pagamento_codigo_key ON public.formas_pagamento USING btree (codigo);
CREATE UNIQUE INDEX formas_pagamento_pkey ON public.formas_pagamento USING btree (id);

-- --------------------------------------------------
-- Tabela: public.formas_pagamento_contexto
-- --------------------------------------------------
CREATE TABLE public.formas_pagamento_contexto (
  "id" bigint NOT NULL DEFAULT nextval('formas_pagamento_contexto_id_seq'::regclass),
  "centro_custo_id" integer NOT NULL,
  "forma_pagamento_codigo" text NOT NULL,
  "descricao_exibicao" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem_exibicao" integer NOT NULL DEFAULT 0,
  "conta_financeira_id" bigint,
  "cartao_maquina_id" bigint,
  "carteira_tipo" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_cartao_maquina_id_fkey FOREIGN KEY (cartao_maquina_id) REFERENCES cartao_maquinas(id);
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_conta_financeira_id_fkey FOREIGN KEY (conta_financeira_id) REFERENCES contas_financeiras(id);
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_forma_pagamento_codigo_fkey FOREIGN KEY (forma_pagamento_codigo) REFERENCES formas_pagamento(codigo);
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_pkey PRIMARY KEY (id);
ALTER TABLE public.formas_pagamento_contexto ADD CONSTRAINT formas_pagamento_contexto_unq UNIQUE (centro_custo_id, forma_pagamento_codigo);

-- Indexes
CREATE INDEX formas_pagamento_contexto_centro_idx ON public.formas_pagamento_contexto USING btree (centro_custo_id);
CREATE INDEX formas_pagamento_contexto_forma_idx ON public.formas_pagamento_contexto USING btree (forma_pagamento_codigo);
CREATE UNIQUE INDEX formas_pagamento_contexto_pkey ON public.formas_pagamento_contexto USING btree (id);
CREATE UNIQUE INDEX formas_pagamento_contexto_unq ON public.formas_pagamento_contexto USING btree (centro_custo_id, forma_pagamento_codigo);

-- --------------------------------------------------
-- Tabela: public.funcoes_colaborador
-- --------------------------------------------------
CREATE TABLE public.funcoes_colaborador (
  "id" integer NOT NULL DEFAULT nextval('funcoes_colaborador_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "grupo" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "grupo_id" bigint
);

-- Constraints
ALTER TABLE public.funcoes_colaborador ADD CONSTRAINT funcoes_colaborador_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES funcoes_grupo(id);
ALTER TABLE public.funcoes_colaborador ADD CONSTRAINT funcoes_colaborador_pkey PRIMARY KEY (id);
ALTER TABLE public.funcoes_colaborador ADD CONSTRAINT funcoes_colaborador_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX funcoes_colaborador_codigo_key ON public.funcoes_colaborador USING btree (codigo);
CREATE UNIQUE INDEX funcoes_colaborador_pkey ON public.funcoes_colaborador USING btree (id);

-- --------------------------------------------------
-- Tabela: public.funcoes_grupo
-- --------------------------------------------------
CREATE TABLE public.funcoes_grupo (
  "id" bigint NOT NULL DEFAULT nextval('funcoes_grupo_id_seq'::regclass),
  "nome" text NOT NULL,
  "pode_lecionar" boolean NOT NULL DEFAULT false,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer,
  "centro_custo_id" bigint
);

-- Constraints
ALTER TABLE public.funcoes_grupo ADD CONSTRAINT funcoes_grupo_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.funcoes_grupo ADD CONSTRAINT funcoes_grupo_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX funcoes_grupo_pkey ON public.funcoes_grupo USING btree (id);

-- --------------------------------------------------
-- Tabela: public.habilidades
-- --------------------------------------------------
CREATE TABLE public.habilidades (
  "id" bigint NOT NULL DEFAULT nextval('habilidades_id_seq'::regclass),
  "curso_id" bigint NOT NULL,
  "nivel_id" bigint NOT NULL,
  "modulo_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "tipo" text,
  "descricao" text,
  "criterio_avaliacao" text,
  "ordem" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.habilidades ADD CONSTRAINT habilidades_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
ALTER TABLE public.habilidades ADD CONSTRAINT habilidades_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE;
ALTER TABLE public.habilidades ADD CONSTRAINT habilidades_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES niveis(id) ON DELETE CASCADE;
ALTER TABLE public.habilidades ADD CONSTRAINT habilidades_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX habilidades_pkey ON public.habilidades USING btree (id);

-- --------------------------------------------------
-- Tabela: public.locais
-- --------------------------------------------------
CREATE TABLE public.locais (
  "id" bigint NOT NULL DEFAULT nextval('locais_id_seq'::regclass),
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'INTERNO'::text,
  "endereco" text,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.locais ADD CONSTRAINT locais_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX locais_nome_uniq ON public.locais USING btree (lower(nome));
CREATE UNIQUE INDEX locais_pkey ON public.locais USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_cores
-- --------------------------------------------------
CREATE TABLE public.loja_cores (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "codigo" text,
  "hex" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_cores ADD CONSTRAINT loja_cores_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX loja_cores_pkey ON public.loja_cores USING btree (id);
CREATE UNIQUE INDEX ux_loja_cores_nome ON public.loja_cores USING btree (upper(TRIM(BOTH FROM nome)));

-- --------------------------------------------------
-- Tabela: public.loja_estoque_movimentos
-- --------------------------------------------------
CREATE TABLE public.loja_estoque_movimentos (
  "id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "origem" text NOT NULL,
  "referencia_id" bigint,
  "quantidade" integer NOT NULL,
  "motivo" text,
  "observacao" text,
  "saldo_antes" integer,
  "saldo_depois" integer,
  "custo_unitario_centavos" integer,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "variante_id" bigint
);

-- Constraints
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_motivo_check CHECK (((motivo IS NULL) OR (motivo = ANY (ARRAY['EXTRAVIO'::text, 'AVARIA'::text, 'USO_INTERNO'::text, 'INVENTARIO_POSITIVO'::text, 'INVENTARIO_NEGATIVO'::text, 'CORRECAO_CADASTRO'::text, 'DEVOLUCAO'::text]))));
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_origem_check CHECK ((origem = ANY (ARRAY['COMPRA'::text, 'VENDA'::text, 'CANCELAMENTO_VENDA'::text, 'AJUSTE_MANUAL'::text])));
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_quantidade_check CHECK ((quantidade > 0));
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_tipo_check CHECK ((tipo = ANY (ARRAY['ENTRADA'::text, 'SAIDA'::text, 'AJUSTE'::text])));
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT fk_loja_mov_variante FOREIGN KEY (variante_id) REFERENCES loja_produto_variantes(id) ON DELETE RESTRICT;
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT fk_loja_movimentos_variante FOREIGN KEY (variante_id) REFERENCES loja_produto_variantes(id) ON DELETE SET NULL;
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES loja_produtos(id) ON DELETE CASCADE;
ALTER TABLE public.loja_estoque_movimentos ADD CONSTRAINT loja_estoque_movimentos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_estoque_mov_origem ON public.loja_estoque_movimentos USING btree (origem, referencia_id);
CREATE INDEX idx_loja_estoque_mov_produto ON public.loja_estoque_movimentos USING btree (produto_id);
CREATE INDEX idx_loja_mov_variante_id ON public.loja_estoque_movimentos USING btree (variante_id);
CREATE INDEX idx_loja_movimentos_variante ON public.loja_estoque_movimentos USING btree (variante_id);
CREATE UNIQUE INDEX loja_estoque_movimentos_pkey ON public.loja_estoque_movimentos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_fornecedor_precos
-- --------------------------------------------------
CREATE TABLE public.loja_fornecedor_precos (
  "id" bigint NOT NULL DEFAULT nextval('loja_fornecedor_precos_id_seq'::regclass),
  "fornecedor_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "preco_custo_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "data_referencia" date NOT NULL DEFAULT CURRENT_DATE,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_fornecedor_precos ADD CONSTRAINT loja_fornecedor_precos_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES loja_fornecedores(id) ON DELETE CASCADE;
ALTER TABLE public.loja_fornecedor_precos ADD CONSTRAINT loja_fornecedor_precos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES loja_produtos(id) ON DELETE CASCADE;
ALTER TABLE public.loja_fornecedor_precos ADD CONSTRAINT loja_fornecedor_precos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_fornecedor_precos_data ON public.loja_fornecedor_precos USING btree (data_referencia DESC);
CREATE INDEX idx_loja_fornecedor_precos_fornecedor ON public.loja_fornecedor_precos USING btree (fornecedor_id);
CREATE INDEX idx_loja_fornecedor_precos_fornecedor_produto_data ON public.loja_fornecedor_precos USING btree (fornecedor_id, produto_id, data_referencia DESC);
CREATE INDEX idx_loja_fornecedor_precos_produto ON public.loja_fornecedor_precos USING btree (produto_id);
CREATE UNIQUE INDEX loja_fornecedor_precos_pkey ON public.loja_fornecedor_precos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_fornecedores
-- --------------------------------------------------
CREATE TABLE public.loja_fornecedores (
  "id" bigint NOT NULL DEFAULT nextval('loja_fornecedores_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "codigo_interno" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_fornecedores ADD CONSTRAINT loja_fornecedores_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.loja_fornecedores ADD CONSTRAINT loja_fornecedores_pkey PRIMARY KEY (id);
ALTER TABLE public.loja_fornecedores ADD CONSTRAINT loja_fornecedores_pessoa_unique UNIQUE (pessoa_id);

-- Indexes
CREATE INDEX idx_loja_fornecedores_ativo ON public.loja_fornecedores USING btree (ativo);
CREATE INDEX idx_loja_fornecedores_pessoa ON public.loja_fornecedores USING btree (pessoa_id);
CREATE UNIQUE INDEX loja_fornecedores_pessoa_unique ON public.loja_fornecedores USING btree (pessoa_id);
CREATE UNIQUE INDEX loja_fornecedores_pkey ON public.loja_fornecedores USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_marcas
-- --------------------------------------------------
CREATE TABLE public.loja_marcas (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_marcas ADD CONSTRAINT loja_marcas_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX loja_marcas_pkey ON public.loja_marcas USING btree (id);
CREATE UNIQUE INDEX ux_loja_marcas_nome ON public.loja_marcas USING btree (upper(TRIM(BOTH FROM nome)));

-- --------------------------------------------------
-- Tabela: public.loja_modelos
-- --------------------------------------------------
CREATE TABLE public.loja_modelos (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_modelos ADD CONSTRAINT loja_modelos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX loja_modelos_pkey ON public.loja_modelos USING btree (id);
CREATE UNIQUE INDEX ux_loja_modelos_nome ON public.loja_modelos USING btree (upper(TRIM(BOTH FROM nome)));

-- --------------------------------------------------
-- Tabela: public.loja_numeracoes
-- --------------------------------------------------
CREATE TABLE public.loja_numeracoes (
  "id" bigint NOT NULL,
  "valor" integer NOT NULL,
  "tipo" text NOT NULL DEFAULT 'CALCADO'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_numeracoes ADD CONSTRAINT loja_numeracoes_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX loja_numeracoes_pkey ON public.loja_numeracoes USING btree (id);
CREATE UNIQUE INDEX ux_loja_numeracoes_tipo_valor ON public.loja_numeracoes USING btree (tipo, valor);

-- --------------------------------------------------
-- Tabela: public.loja_pedidos_compra
-- --------------------------------------------------
CREATE TABLE public.loja_pedidos_compra (
  "id" bigint NOT NULL DEFAULT nextval('loja_pedidos_compra_id_seq'::regclass),
  "fornecedor_id" bigint NOT NULL,
  "data_pedido" timestamp with time zone NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'RASCUNHO'::text,
  "valor_estimado_centavos" integer NOT NULL DEFAULT 0,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "conta_pagar_id" bigint
);

-- Constraints
ALTER TABLE public.loja_pedidos_compra ADD CONSTRAINT loja_pedidos_compra_conta_pagar_id_fkey FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_pedidos_compra ADD CONSTRAINT loja_pedidos_compra_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id);
ALTER TABLE public.loja_pedidos_compra ADD CONSTRAINT loja_pedidos_compra_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES loja_fornecedores(id);
ALTER TABLE public.loja_pedidos_compra ADD CONSTRAINT loja_pedidos_compra_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(user_id);
ALTER TABLE public.loja_pedidos_compra ADD CONSTRAINT loja_pedidos_compra_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_pedidos_compra_fornecedor ON public.loja_pedidos_compra USING btree (fornecedor_id);
CREATE INDEX idx_loja_pedidos_compra_status ON public.loja_pedidos_compra USING btree (status);
CREATE UNIQUE INDEX loja_pedidos_compra_pkey ON public.loja_pedidos_compra USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_pedidos_compra_itens
-- --------------------------------------------------
CREATE TABLE public.loja_pedidos_compra_itens (
  "id" bigint NOT NULL DEFAULT nextval('loja_pedidos_compra_itens_id_seq'::regclass),
  "pedido_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "quantidade_solicitada" integer NOT NULL,
  "quantidade_recebida" integer NOT NULL DEFAULT 0,
  "preco_custo_centavos" integer NOT NULL DEFAULT 0,
  "observacoes" text,
  "quantidade_pedida" integer NOT NULL DEFAULT 0,
  "variante_id" bigint NOT NULL
);

-- Constraints
ALTER TABLE public.loja_pedidos_compra_itens ADD CONSTRAINT fk_loja_compra_item_variante FOREIGN KEY (variante_id) REFERENCES loja_produto_variantes(id) ON DELETE SET NULL;
ALTER TABLE public.loja_pedidos_compra_itens ADD CONSTRAINT loja_pedidos_compra_itens_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES loja_pedidos_compra(id) ON DELETE CASCADE;
ALTER TABLE public.loja_pedidos_compra_itens ADD CONSTRAINT loja_pedidos_compra_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES loja_produtos(id);
ALTER TABLE public.loja_pedidos_compra_itens ADD CONSTRAINT loja_pedidos_compra_itens_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_compra_item_variante_id ON public.loja_pedidos_compra_itens USING btree (variante_id);
CREATE INDEX idx_loja_compra_itens_pedido_id ON public.loja_pedidos_compra_itens USING btree (pedido_id);
CREATE INDEX idx_loja_compra_itens_variante_id ON public.loja_pedidos_compra_itens USING btree (variante_id);
CREATE INDEX idx_loja_pedidos_compra_itens_pedido ON public.loja_pedidos_compra_itens USING btree (pedido_id);
CREATE UNIQUE INDEX loja_pedidos_compra_itens_pkey ON public.loja_pedidos_compra_itens USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_pedidos_compra_recebimentos
-- --------------------------------------------------
CREATE TABLE public.loja_pedidos_compra_recebimentos (
  "id" bigint NOT NULL DEFAULT nextval('loja_pedidos_compra_recebimentos_id_seq'::regclass),
  "pedido_id" bigint NOT NULL,
  "item_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "quantidade_recebida" integer NOT NULL,
  "preco_custo_centavos" integer NOT NULL,
  "data_recebimento" timestamp with time zone NOT NULL DEFAULT now(),
  "observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "quantidade" integer NOT NULL
);

-- Constraints
ALTER TABLE public.loja_pedidos_compra_recebimentos ADD CONSTRAINT loja_pedidos_compra_recebimentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id);
ALTER TABLE public.loja_pedidos_compra_recebimentos ADD CONSTRAINT loja_pedidos_compra_recebimentos_item_id_fkey FOREIGN KEY (item_id) REFERENCES loja_pedidos_compra_itens(id) ON DELETE CASCADE;
ALTER TABLE public.loja_pedidos_compra_recebimentos ADD CONSTRAINT loja_pedidos_compra_recebimentos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES loja_pedidos_compra(id) ON DELETE CASCADE;
ALTER TABLE public.loja_pedidos_compra_recebimentos ADD CONSTRAINT loja_pedidos_compra_recebimentos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES loja_produtos(id);
ALTER TABLE public.loja_pedidos_compra_recebimentos ADD CONSTRAINT loja_pedidos_compra_recebimentos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_pedidos_compra_recebimentos_pedido ON public.loja_pedidos_compra_recebimentos USING btree (pedido_id);
CREATE INDEX idx_loja_pedidos_compra_recebimentos_produto ON public.loja_pedidos_compra_recebimentos USING btree (produto_id);
CREATE UNIQUE INDEX loja_pedidos_compra_recebimentos_pkey ON public.loja_pedidos_compra_recebimentos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_produto_categoria
-- --------------------------------------------------
CREATE TABLE public.loja_produto_categoria (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "codigo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_produto_categoria ADD CONSTRAINT loja_produto_categoria_pkey PRIMARY KEY (id);
ALTER TABLE public.loja_produto_categoria ADD CONSTRAINT loja_produto_categoria_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX loja_produto_categoria_codigo_key ON public.loja_produto_categoria USING btree (codigo);
CREATE UNIQUE INDEX loja_produto_categoria_pkey ON public.loja_produto_categoria USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_produto_categoria_subcategoria
-- --------------------------------------------------
CREATE TABLE public.loja_produto_categoria_subcategoria (
  "id" bigint NOT NULL,
  "categoria_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "codigo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "centro_custo_id" bigint,
  "receita_categoria_id" bigint,
  "despesa_categoria_id" bigint,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_produto_categoria_subcategoria ADD CONSTRAINT loja_subcategoria_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES loja_produto_categoria(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.loja_produto_categoria_subcategoria ADD CONSTRAINT loja_subcategoria_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_produto_categoria_subcategoria ADD CONSTRAINT loja_subcategoria_despesa_categoria_id_fkey FOREIGN KEY (despesa_categoria_id) REFERENCES categorias_financeiras(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_produto_categoria_subcategoria ADD CONSTRAINT loja_subcategoria_receita_categoria_id_fkey FOREIGN KEY (receita_categoria_id) REFERENCES categorias_financeiras(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_produto_categoria_subcategoria ADD CONSTRAINT loja_produto_categoria_subcategoria_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_subcategoria_categoria_id ON public.loja_produto_categoria_subcategoria USING btree (categoria_id);
CREATE UNIQUE INDEX loja_produto_categoria_subcategoria_pkey ON public.loja_produto_categoria_subcategoria USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_produto_variantes
-- --------------------------------------------------
CREATE TABLE public.loja_produto_variantes (
  "id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "sku" text NOT NULL,
  "cor_id" bigint,
  "numeracao_id" bigint,
  "tamanho_id" bigint,
  "estoque_atual" integer NOT NULL DEFAULT 0,
  "preco_venda_centavos" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_produto_variantes ADD CONSTRAINT fk_loja_variantes_cor FOREIGN KEY (cor_id) REFERENCES loja_cores(id) ON DELETE SET NULL;
ALTER TABLE public.loja_produto_variantes ADD CONSTRAINT fk_loja_variantes_numeracao FOREIGN KEY (numeracao_id) REFERENCES loja_numeracoes(id) ON DELETE SET NULL;
ALTER TABLE public.loja_produto_variantes ADD CONSTRAINT fk_loja_variantes_produto FOREIGN KEY (produto_id) REFERENCES loja_produtos(id) ON DELETE CASCADE;
ALTER TABLE public.loja_produto_variantes ADD CONSTRAINT fk_loja_variantes_tamanho FOREIGN KEY (tamanho_id) REFERENCES loja_tamanhos(id) ON DELETE SET NULL;
ALTER TABLE public.loja_produto_variantes ADD CONSTRAINT loja_produto_variantes_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_variantes_busca_calcado ON public.loja_produto_variantes USING btree (produto_id, cor_id, numeracao_id);
CREATE INDEX idx_loja_variantes_busca_roupa ON public.loja_produto_variantes USING btree (produto_id, cor_id, tamanho_id);
CREATE INDEX idx_loja_variantes_produto_id ON public.loja_produto_variantes USING btree (produto_id);
CREATE UNIQUE INDEX loja_produto_variantes_pkey ON public.loja_produto_variantes USING btree (id);
CREATE UNIQUE INDEX ux_loja_variantes_combo ON public.loja_produto_variantes USING btree (produto_id, COALESCE(cor_id, (0)::bigint), COALESCE(numeracao_id, (0)::bigint), COALESCE(tamanho_id, (0)::bigint));
CREATE UNIQUE INDEX ux_loja_variantes_sku ON public.loja_produto_variantes USING btree (sku);

-- --------------------------------------------------
-- Tabela: public.loja_produtos
-- --------------------------------------------------
CREATE TABLE public.loja_produtos (
  "id" bigint NOT NULL DEFAULT nextval('loja_produtos_id_seq'::regclass),
  "codigo" text,
  "nome" text NOT NULL,
  "descricao" text,
  "categoria" text,
  "preco_venda_centavos" integer NOT NULL,
  "unidade" text NOT NULL DEFAULT 'UN'::text,
  "estoque_atual" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "bloqueado_para_venda" boolean NOT NULL DEFAULT false,
  "categoria_subcategoria_id" bigint,
  "fornecedor_principal_id" bigint,
  "marca_id" bigint,
  "modelo_id" bigint
);

-- Constraints
ALTER TABLE public.loja_produtos ADD CONSTRAINT fk_loja_produtos_marca_id FOREIGN KEY (marca_id) REFERENCES loja_marcas(id) ON DELETE SET NULL;
ALTER TABLE public.loja_produtos ADD CONSTRAINT fk_loja_produtos_modelo_id FOREIGN KEY (modelo_id) REFERENCES loja_modelos(id) ON DELETE SET NULL;
ALTER TABLE public.loja_produtos ADD CONSTRAINT loja_produtos_categoria_subcategoria_fk FOREIGN KEY (categoria_subcategoria_id) REFERENCES loja_produto_categoria_subcategoria(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_produtos ADD CONSTRAINT loja_produtos_fornecedor_principal_fk FOREIGN KEY (fornecedor_principal_id) REFERENCES loja_fornecedores(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.loja_produtos ADD CONSTRAINT loja_produtos_pkey PRIMARY KEY (id);
ALTER TABLE public.loja_produtos ADD CONSTRAINT loja_produtos_codigo_key UNIQUE (codigo);

-- Indexes
CREATE INDEX idx_loja_produtos_categoria ON public.loja_produtos USING btree (categoria);
CREATE INDEX idx_loja_produtos_categoria_subcategoria ON public.loja_produtos USING btree (categoria_subcategoria_id);
CREATE INDEX idx_loja_produtos_fornecedor_principal ON public.loja_produtos USING btree (fornecedor_principal_id);
CREATE INDEX idx_loja_produtos_marca_id ON public.loja_produtos USING btree (marca_id);
CREATE INDEX idx_loja_produtos_modelo_id ON public.loja_produtos USING btree (modelo_id);
CREATE INDEX idx_loja_produtos_nome ON public.loja_produtos USING btree (nome);
CREATE UNIQUE INDEX loja_produtos_codigo_key ON public.loja_produtos USING btree (codigo);
CREATE UNIQUE INDEX loja_produtos_pkey ON public.loja_produtos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_tamanhos
-- --------------------------------------------------
CREATE TABLE public.loja_tamanhos (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'ROUPA'::text,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.loja_tamanhos ADD CONSTRAINT loja_tamanhos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX loja_tamanhos_pkey ON public.loja_tamanhos USING btree (id);
CREATE UNIQUE INDEX ux_loja_tamanhos_tipo_nome ON public.loja_tamanhos USING btree (tipo, upper(TRIM(BOTH FROM nome)));

-- --------------------------------------------------
-- Tabela: public.loja_venda_itens
-- --------------------------------------------------
CREATE TABLE public.loja_venda_itens (
  "id" bigint NOT NULL DEFAULT nextval('loja_venda_itens_id_seq'::regclass),
  "venda_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "quantidade" integer NOT NULL,
  "preco_unitario_centavos" integer NOT NULL,
  "total_centavos" integer NOT NULL,
  "beneficiario_pessoa_id" bigint,
  "observacoes" text,
  "variante_id" bigint
);

-- Constraints
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_preco_unitario_centavos_check CHECK ((preco_unitario_centavos >= 0));
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_quantidade_check CHECK ((quantidade > 0));
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_total_centavos_check CHECK ((total_centavos >= 0));
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT fk_loja_venda_item_variante FOREIGN KEY (variante_id) REFERENCES loja_produto_variantes(id) ON DELETE SET NULL;
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_beneficiario_pessoa_id_fkey FOREIGN KEY (beneficiario_pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES loja_produtos(id);
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES loja_vendas(id) ON DELETE CASCADE;
ALTER TABLE public.loja_venda_itens ADD CONSTRAINT loja_venda_itens_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_venda_item_variante_id ON public.loja_venda_itens USING btree (variante_id);
CREATE INDEX idx_loja_venda_itens_beneficiario ON public.loja_venda_itens USING btree (beneficiario_pessoa_id);
CREATE INDEX idx_loja_venda_itens_produto ON public.loja_venda_itens USING btree (produto_id);
CREATE INDEX idx_loja_venda_itens_venda ON public.loja_venda_itens USING btree (venda_id);
CREATE UNIQUE INDEX loja_venda_itens_pkey ON public.loja_venda_itens USING btree (id);

-- --------------------------------------------------
-- Tabela: public.loja_vendas
-- --------------------------------------------------
CREATE TABLE public.loja_vendas (
  "id" bigint NOT NULL DEFAULT nextval('loja_vendas_id_seq'::regclass),
  "cliente_pessoa_id" bigint NOT NULL,
  "tipo_venda" text NOT NULL,
  "valor_total_centavos" integer NOT NULL,
  "desconto_centavos" integer NOT NULL DEFAULT 0,
  "forma_pagamento" text NOT NULL,
  "status_pagamento" text NOT NULL,
  "status_venda" text NOT NULL DEFAULT 'ATIVA'::text,
  "data_venda" timestamp with time zone NOT NULL DEFAULT now(),
  "data_vencimento" date,
  "observacoes" text,
  "observacao_vendedor" text,
  "vendedor_user_id" uuid,
  "cancelada_em" timestamp with time zone,
  "cancelada_por_user_id" uuid,
  "motivo_cancelamento" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "cobranca_id" bigint,
  "conta_conexao_id" bigint,
  "numero_parcelas" integer
);

-- Constraints
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_status_venda_check CHECK ((status_venda = ANY (ARRAY['ATIVA'::text, 'CANCELADA'::text])));
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_tipo_venda_check CHECK ((tipo_venda = ANY (ARRAY['VENDA'::text, 'CREDIARIO_INTERNO'::text, 'ENTREGA_FIGURINO'::text])));
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_cancelada_por_user_id_fkey FOREIGN KEY (cancelada_por_user_id) REFERENCES profiles(user_id);
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_cliente_pessoa_id_fkey FOREIGN KEY (cliente_pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_cobranca_id_fkey FOREIGN KEY (cobranca_id) REFERENCES cobrancas(id);
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_vendedor_user_id_fkey FOREIGN KEY (vendedor_user_id) REFERENCES profiles(user_id);
ALTER TABLE public.loja_vendas ADD CONSTRAINT loja_vendas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_loja_vendas_cliente ON public.loja_vendas USING btree (cliente_pessoa_id);
CREATE INDEX idx_loja_vendas_data ON public.loja_vendas USING btree (data_venda);
CREATE INDEX idx_loja_vendas_data_venda ON public.loja_vendas USING btree (data_venda);
CREATE INDEX idx_loja_vendas_status_pagamento ON public.loja_vendas USING btree (status_pagamento);
CREATE INDEX idx_loja_vendas_status_venda ON public.loja_vendas USING btree (status_venda);
CREATE INDEX idx_loja_vendas_tipo_venda ON public.loja_vendas USING btree (tipo_venda);
CREATE INDEX idx_loja_vendas_vendedor ON public.loja_vendas USING btree (vendedor_user_id);
CREATE UNIQUE INDEX loja_vendas_pkey ON public.loja_vendas USING btree (id);

-- --------------------------------------------------
-- Tabela: public.matricula_configuracoes
-- --------------------------------------------------
CREATE TABLE public.matricula_configuracoes (
  "id" bigint NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "vencimento_dia_padrao" smallint NOT NULL DEFAULT 4,
  "mes_referencia_dias" smallint NOT NULL DEFAULT 30,
  "parcelas_padrao" smallint NOT NULL DEFAULT 12,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "arredondamento_centavos" text NOT NULL DEFAULT 'ARREDONDA_NO_FINAL'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "multa_percentual_padrao" numeric(5,2) NOT NULL DEFAULT 2.00,
  "juros_mora_percentual_mensal_padrao" numeric(5,2) NOT NULL DEFAULT 1.00
);

-- Constraints
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_config_juros_chk CHECK (((juros_mora_percentual_mensal_padrao >= (0)::numeric) AND (juros_mora_percentual_mensal_padrao <= 10.00)));
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_config_multa_chk CHECK (((multa_percentual_padrao >= (0)::numeric) AND (multa_percentual_padrao <= 2.00)));
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_configuracoes_mes_referencia_dias_check CHECK ((mes_referencia_dias = 30));
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_configuracoes_parcelas_padrao_check CHECK (((parcelas_padrao >= 1) AND (parcelas_padrao <= 24)));
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_configuracoes_vencimento_dia_padrao_check CHECK (((vencimento_dia_padrao >= 1) AND (vencimento_dia_padrao <= 28)));
ALTER TABLE public.matricula_configuracoes ADD CONSTRAINT matricula_configuracoes_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX matricula_configuracoes_ativo_uniq ON public.matricula_configuracoes USING btree (ativo) WHERE (ativo = true);
CREATE UNIQUE INDEX matricula_configuracoes_pkey ON public.matricula_configuracoes USING btree (id);

-- --------------------------------------------------
-- Tabela: public.matricula_planos
-- --------------------------------------------------
CREATE TABLE public.matricula_planos (
  "id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "valor_mensal_base_centavos" integer NOT NULL,
  "total_parcelas" smallint NOT NULL DEFAULT 12,
  "valor_anuidade_centavos" integer NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- Constraints
ALTER TABLE public.matricula_planos ADD CONSTRAINT matricula_planos_total_parcelas_check CHECK (((total_parcelas >= 1) AND (total_parcelas <= 24)));
ALTER TABLE public.matricula_planos ADD CONSTRAINT matricula_planos_valor_anuidade_centavos_check CHECK ((valor_anuidade_centavos > 0));
ALTER TABLE public.matricula_planos ADD CONSTRAINT matricula_planos_valor_mensal_base_centavos_check CHECK ((valor_mensal_base_centavos > 0));
ALTER TABLE public.matricula_planos ADD CONSTRAINT matricula_planos_pkey PRIMARY KEY (id);
ALTER TABLE public.matricula_planos ADD CONSTRAINT matricula_planos_codigo_key UNIQUE (codigo);

-- Indexes
CREATE INDEX matricula_planos_ativo_idx ON public.matricula_planos USING btree (ativo);
CREATE UNIQUE INDEX matricula_planos_codigo_key ON public.matricula_planos USING btree (codigo);
CREATE UNIQUE INDEX matricula_planos_pkey ON public.matricula_planos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.matricula_precos_servico
-- --------------------------------------------------
CREATE TABLE public.matricula_precos_servico (
  "id" bigint NOT NULL,
  "servico_id" bigint NOT NULL,
  "descricao" text,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "ano_referencia" integer
);

-- Constraints
ALTER TABLE public.matricula_precos_servico ADD CONSTRAINT matricula_precos_servico_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE;
ALTER TABLE public.matricula_precos_servico ADD CONSTRAINT matricula_precos_servico_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_matricula_precos_servico_ano ON public.matricula_precos_servico USING btree (ano_referencia);
CREATE INDEX idx_matricula_precos_servico_servico ON public.matricula_precos_servico USING btree (servico_id);
CREATE UNIQUE INDEX matricula_precos_servico_pkey ON public.matricula_precos_servico USING btree (id);

-- --------------------------------------------------
-- Tabela: public.matricula_precos_turma
-- --------------------------------------------------
CREATE TABLE public.matricula_precos_turma (
  "id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "ano_referencia" integer NOT NULL,
  "plano_id" bigint NOT NULL,
  "centro_custo_id" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- Constraints
ALTER TABLE public.matricula_precos_turma ADD CONSTRAINT matricula_precos_turma_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX matricula_precos_turma_lookup_idx ON public.matricula_precos_turma USING btree (ano_referencia, turma_id, ativo);
CREATE UNIQUE INDEX matricula_precos_turma_pkey ON public.matricula_precos_turma USING btree (id);
CREATE INDEX matricula_precos_turma_plano_idx ON public.matricula_precos_turma USING btree (plano_id);
CREATE UNIQUE INDEX matricula_precos_turma_uniq ON public.matricula_precos_turma USING btree (turma_id, ano_referencia) WHERE (ativo = true);

-- --------------------------------------------------
-- Tabela: public.matriculas
-- --------------------------------------------------
CREATE TABLE public.matriculas (
  "id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "responsavel_financeiro_id" bigint NOT NULL,
  "tipo_matricula" tipo_matricula_enum NOT NULL,
  "vinculo_id" bigint NOT NULL,
  "plano_matricula_id" bigint,
  "contrato_modelo_id" bigint,
  "contrato_emitido_id" bigint,
  "contrato_pdf_url" text,
  "status" status_matricula_enum NOT NULL,
  "ano_referencia" integer,
  "data_matricula" date NOT NULL DEFAULT CURRENT_DATE,
  "data_encerramento" date,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "metodo_liquidacao" text NOT NULL DEFAULT 'CARTAO_CONEXAO'::text,
  "servico_id" bigint,
  "plano_id" bigint
);

-- Constraints
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_metodo_liquidacao_chk CHECK ((metodo_liquidacao = ANY (ARRAY['CARTAO_CONEXAO'::text, 'COBRANCAS_LEGADO'::text, 'CREDITO_BOLSA'::text])));
ALTER TABLE public.matriculas ADD CONSTRAINT fk_matriculas_servico_id FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL;
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_responsavel_financeiro_id_fkey FOREIGN KEY (responsavel_financeiro_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_vinculo_id_fkey FOREIGN KEY (vinculo_id) REFERENCES turmas(turma_id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_matriculas_metodo_liquidacao ON public.matriculas USING btree (metodo_liquidacao);
CREATE INDEX idx_matriculas_pessoa ON public.matriculas USING btree (pessoa_id);
CREATE INDEX idx_matriculas_plano_id ON public.matriculas USING btree (plano_id);
CREATE INDEX idx_matriculas_responsavel ON public.matriculas USING btree (responsavel_financeiro_id);
CREATE INDEX idx_matriculas_servico_id ON public.matriculas USING btree (servico_id);
CREATE INDEX idx_matriculas_status ON public.matriculas USING btree (status);
CREATE INDEX idx_matriculas_tipo_ano ON public.matriculas USING btree (tipo_matricula, ano_referencia);
CREATE INDEX idx_matriculas_vinculo ON public.matriculas USING btree (vinculo_id);
CREATE UNIQUE INDEX matriculas_pkey ON public.matriculas USING btree (id);
CREATE UNIQUE INDEX uniq_matriculas_pessoa_tipo_vinculo_regular ON public.matriculas USING btree (pessoa_id, tipo_matricula, vinculo_id) WHERE (tipo_matricula = 'REGULAR'::tipo_matricula_enum);

-- --------------------------------------------------
-- Tabela: public.matriculas_itens
-- --------------------------------------------------
CREATE TABLE public.matriculas_itens (
  "id" bigint NOT NULL,
  "matricula_id" bigint NOT NULL,
  "item_id" bigint NOT NULL,
  "quantidade" integer NOT NULL DEFAULT 1,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.matriculas_itens ADD CONSTRAINT matriculas_itens_item_id_fkey FOREIGN KEY (item_id) REFERENCES servico_itens(id);
ALTER TABLE public.matriculas_itens ADD CONSTRAINT matriculas_itens_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE;
ALTER TABLE public.matriculas_itens ADD CONSTRAINT matriculas_itens_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_matriculas_itens_matricula ON public.matriculas_itens USING btree (matricula_id);
CREATE UNIQUE INDEX matriculas_itens_pkey ON public.matriculas_itens USING btree (id);

-- --------------------------------------------------
-- Tabela: public.modelos_pagamento_colaborador
-- --------------------------------------------------
CREATE TABLE public.modelos_pagamento_colaborador (
  "id" integer NOT NULL DEFAULT nextval('modelos_pagamento_colaborador_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "descricao" text,
  "unidade" text,
  "centro_custo_id" integer,
  "categoria_financeira_id" integer,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.modelos_pagamento_colaborador ADD CONSTRAINT modelos_pagamento_colaborador_categoria_financeira_id_fkey FOREIGN KEY (categoria_financeira_id) REFERENCES categorias_financeiras(id);
ALTER TABLE public.modelos_pagamento_colaborador ADD CONSTRAINT modelos_pagamento_colaborador_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.modelos_pagamento_colaborador ADD CONSTRAINT modelos_pagamento_colaborador_pkey PRIMARY KEY (id);
ALTER TABLE public.modelos_pagamento_colaborador ADD CONSTRAINT modelos_pagamento_colaborador_codigo_key UNIQUE (codigo);

-- Indexes
CREATE INDEX idx_modpag_categoria ON public.modelos_pagamento_colaborador USING btree (categoria_financeira_id);
CREATE INDEX idx_modpag_centro ON public.modelos_pagamento_colaborador USING btree (centro_custo_id);
CREATE UNIQUE INDEX modelos_pagamento_colaborador_codigo_key ON public.modelos_pagamento_colaborador USING btree (codigo);
CREATE UNIQUE INDEX modelos_pagamento_colaborador_pkey ON public.modelos_pagamento_colaborador USING btree (id);

-- --------------------------------------------------
-- Tabela: public.modulos
-- --------------------------------------------------
CREATE TABLE public.modulos (
  "id" bigint NOT NULL DEFAULT nextval('modulos_id_seq'::regclass),
  "curso_id" bigint NOT NULL,
  "nivel_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer NOT NULL DEFAULT 1,
  "obrigatorio" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.modulos ADD CONSTRAINT modulos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
ALTER TABLE public.modulos ADD CONSTRAINT modulos_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES niveis(id) ON DELETE CASCADE;
ALTER TABLE public.modulos ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX modulos_pkey ON public.modulos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.movimento_financeiro
-- --------------------------------------------------
CREATE TABLE public.movimento_financeiro (
  "id" bigint NOT NULL DEFAULT nextval('movimento_financeiro_id_seq'::regclass),
  "tipo" text NOT NULL,
  "centro_custo_id" integer NOT NULL,
  "valor_centavos" integer NOT NULL,
  "data_movimento" timestamp with time zone NOT NULL,
  "origem" text NOT NULL,
  "origem_id" bigint,
  "descricao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "usuario_id" uuid
);

-- Constraints
ALTER TABLE public.movimento_financeiro ADD CONSTRAINT movimento_financeiro_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.movimento_financeiro ADD CONSTRAINT movimento_financeiro_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX movimento_financeiro_pkey ON public.movimento_financeiro USING btree (id);

-- --------------------------------------------------
-- Tabela: public.niveis
-- --------------------------------------------------
CREATE TABLE public.niveis (
  "id" bigint NOT NULL DEFAULT nextval('niveis_id_seq'::regclass),
  "curso_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "faixa_etaria_sugerida" text,
  "pre_requisito_nivel_id" bigint,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "idade_minima" integer,
  "idade_maxima" integer
);

-- Constraints
ALTER TABLE public.niveis ADD CONSTRAINT niveis_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
ALTER TABLE public.niveis ADD CONSTRAINT niveis_pre_requisito_nivel_id_fkey FOREIGN KEY (pre_requisito_nivel_id) REFERENCES niveis(id);
ALTER TABLE public.niveis ADD CONSTRAINT niveis_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX niveis_pkey ON public.niveis USING btree (id);

-- --------------------------------------------------
-- Tabela: public.pessoas
-- --------------------------------------------------
CREATE TABLE public.pessoas (
  "id" bigint NOT NULL DEFAULT nextval('pessoas_id_seq'::regclass),
  "user_id" uuid,
  "nome" text NOT NULL,
  "email" text,
  "telefone" text,
  "nascimento" date,
  "cpf" text,
  "endereco" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "tipo_pessoa" text DEFAULT 'FISICA'::text,
  "ativo" boolean DEFAULT true,
  "observacoes" text,
  "neofin_customer_id" text,
  "created_by" uuid,
  "updated_by" uuid,
  "foto_url" text,
  "nome_social" text,
  "genero" genero_pessoa NOT NULL DEFAULT 'NAO_INFORMADO'::genero_pessoa,
  "estado_civil" estado_civil_pessoa,
  "nacionalidade" text,
  "naturalidade" text,
  "telefone_secundario" text,
  "cnpj" text,
  "razao_social" text,
  "nome_fantasia" text,
  "inscricao_estadual" text,
  "endereco_id" bigint
);

-- Constraints
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_created_by_fk FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_endereco_id_fkey FOREIGN KEY (endereco_id) REFERENCES enderecos(id);
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_updated_by_fk FOREIGN KEY (updated_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.pessoas ADD CONSTRAINT pessoas_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX pessoas_cpf_ativo_uniq ON public.pessoas USING btree (cpf) WHERE ((ativo = true) AND (cpf IS NOT NULL));
CREATE UNIQUE INDEX pessoas_pkey ON public.pessoas USING btree (id);
CREATE INDEX pessoas_user_id_idx ON public.pessoas USING btree (user_id);

-- --------------------------------------------------
-- Tabela: public.pessoas_roles
-- --------------------------------------------------
CREATE TABLE public.pessoas_roles (
  "id" bigint NOT NULL DEFAULT nextval('pessoas_roles_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.pessoas_roles ADD CONSTRAINT pessoas_roles_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE;
ALTER TABLE public.pessoas_roles ADD CONSTRAINT pessoas_roles_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX pessoas_roles_pessoa_id_idx ON public.pessoas_roles USING btree (pessoa_id);
CREATE UNIQUE INDEX pessoas_roles_pkey ON public.pessoas_roles USING btree (id);
CREATE UNIQUE INDEX pessoas_roles_unico_pessoa_role ON public.pessoas_roles USING btree (pessoa_id, role);

-- --------------------------------------------------
-- Tabela: public.plano_contas
-- --------------------------------------------------
CREATE TABLE public.plano_contas (
  "id" integer NOT NULL DEFAULT nextval('plano_contas_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "parent_id" integer
);

-- Constraints
ALTER TABLE public.plano_contas ADD CONSTRAINT plano_contas_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES plano_contas(id);
ALTER TABLE public.plano_contas ADD CONSTRAINT plano_contas_pkey PRIMARY KEY (id);
ALTER TABLE public.plano_contas ADD CONSTRAINT plano_contas_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX plano_contas_codigo_key ON public.plano_contas USING btree (codigo);
CREATE UNIQUE INDEX plano_contas_pkey ON public.plano_contas USING btree (id);

-- --------------------------------------------------
-- Tabela: public.professores
-- --------------------------------------------------
CREATE TABLE public.professores (
  "id" bigint NOT NULL DEFAULT nextval('professores_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "tipo_professor_id" integer,
  "bio" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text
);

-- Constraints
ALTER TABLE public.professores ADD CONSTRAINT professores_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE public.professores ADD CONSTRAINT professores_tipo_professor_id_fkey FOREIGN KEY (tipo_professor_id) REFERENCES tipos_professor(id);
ALTER TABLE public.professores ADD CONSTRAINT professores_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX professores_pkey ON public.professores USING btree (id);
CREATE UNIQUE INDEX ux_professores_colaborador ON public.professores USING btree (colaborador_id);

-- --------------------------------------------------
-- Tabela: public.profiles
-- --------------------------------------------------
CREATE TABLE public.profiles (
  "user_id" uuid NOT NULL,
  "full_name" text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "pessoa_id" integer NOT NULL
);

-- Constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pessoa_id_unique UNIQUE (pessoa_id);

-- Indexes
CREATE UNIQUE INDEX profiles_pessoa_id_unique ON public.profiles USING btree (pessoa_id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

-- --------------------------------------------------
-- Tabela: public.recebimentos
-- --------------------------------------------------
CREATE TABLE public.recebimentos (
  "id" bigint NOT NULL DEFAULT nextval('recebimentos_id_seq'::regclass),
  "cobranca_id" bigint,
  "centro_custo_id" integer,
  "valor_centavos" integer NOT NULL,
  "data_pagamento" timestamp with time zone NOT NULL,
  "metodo_pagamento" text NOT NULL,
  "origem_sistema" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "forma_pagamento_codigo" text,
  "cartao_maquina_id" bigint,
  "cartao_bandeira_id" bigint,
  "cartao_numero_parcelas" integer
);

-- Constraints
ALTER TABLE public.recebimentos ADD CONSTRAINT recebimentos_cartao_bandeira_id_fkey FOREIGN KEY (cartao_bandeira_id) REFERENCES cartao_bandeiras(id);
ALTER TABLE public.recebimentos ADD CONSTRAINT recebimentos_cartao_maquina_id_fkey FOREIGN KEY (cartao_maquina_id) REFERENCES cartao_maquinas(id);
ALTER TABLE public.recebimentos ADD CONSTRAINT recebimentos_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id);
ALTER TABLE public.recebimentos ADD CONSTRAINT recebimentos_cobranca_id_fkey FOREIGN KEY (cobranca_id) REFERENCES cobrancas(id) ON DELETE CASCADE;
ALTER TABLE public.recebimentos ADD CONSTRAINT recebimentos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_recebimentos_cobranca_id ON public.recebimentos USING btree (cobranca_id) WHERE (cobranca_id IS NOT NULL);
CREATE UNIQUE INDEX recebimentos_pkey ON public.recebimentos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.roles_sistema
-- --------------------------------------------------
CREATE TABLE public.roles_sistema (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "editavel" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "permissoes" jsonb,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.roles_sistema ADD CONSTRAINT roles_sistema_pkey PRIMARY KEY (id);
ALTER TABLE public.roles_sistema ADD CONSTRAINT roles_sistema_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX roles_sistema_codigo_key ON public.roles_sistema USING btree (codigo);
CREATE UNIQUE INDEX roles_sistema_pkey ON public.roles_sistema USING btree (id);

-- --------------------------------------------------
-- Tabela: public.ruas
-- --------------------------------------------------
CREATE TABLE public.ruas (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "bairro_id" uuid,
  "nome" text NOT NULL,
  "cep" text,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.ruas ADD CONSTRAINT ruas_bairro_id_fkey FOREIGN KEY (bairro_id) REFERENCES bairros(id);
ALTER TABLE public.ruas ADD CONSTRAINT ruas_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX ruas_pkey ON public.ruas USING btree (id);

-- --------------------------------------------------
-- Tabela: public.servico_itens
-- --------------------------------------------------
CREATE TABLE public.servico_itens (
  "id" bigint NOT NULL,
  "servico_id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "tipo_item" text NOT NULL DEFAULT 'PADRAO'::text,
  "obrigatorio" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "destino_centro_custo_id" integer,
  "destino_categoria_financeira_id" integer
);

-- Constraints
ALTER TABLE public.servico_itens ADD CONSTRAINT servico_itens_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE;
ALTER TABLE public.servico_itens ADD CONSTRAINT servico_itens_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_servico_itens_destino_cc ON public.servico_itens USING btree (destino_centro_custo_id);
CREATE UNIQUE INDEX servico_itens_pkey ON public.servico_itens USING btree (id);
CREATE UNIQUE INDEX uq_servico_itens_codigo ON public.servico_itens USING btree (servico_id, codigo);

-- --------------------------------------------------
-- Tabela: public.servico_itens_precos
-- --------------------------------------------------
CREATE TABLE public.servico_itens_precos (
  "id" bigint NOT NULL,
  "item_id" bigint NOT NULL,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "vigencia_inicio" date,
  "vigencia_fim" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.servico_itens_precos ADD CONSTRAINT servico_itens_precos_item_id_fkey FOREIGN KEY (item_id) REFERENCES servico_itens(id) ON DELETE CASCADE;
ALTER TABLE public.servico_itens_precos ADD CONSTRAINT servico_itens_precos_pkey PRIMARY KEY (id);

-- Indexes
CREATE INDEX idx_servico_itens_precos_item ON public.servico_itens_precos USING btree (item_id);
CREATE UNIQUE INDEX servico_itens_precos_pkey ON public.servico_itens_precos USING btree (id);

-- --------------------------------------------------
-- Tabela: public.servicos
-- --------------------------------------------------
CREATE TABLE public.servicos (
  "id" bigint NOT NULL,
  "tipo" tipo_servico NOT NULL,
  "referencia_tipo" text NOT NULL,
  "referencia_id" bigint NOT NULL,
  "titulo" text,
  "ano_referencia" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.servicos ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);
ALTER TABLE public.servicos ADD CONSTRAINT uq_servicos_tipo_ref_ano UNIQUE (tipo, referencia_tipo, referencia_id, ano_referencia);

-- Indexes
CREATE INDEX idx_servicos_lookup ON public.servicos USING btree (tipo, referencia_tipo, referencia_id, ano_referencia);
CREATE UNIQUE INDEX servicos_pkey ON public.servicos USING btree (id);
CREATE UNIQUE INDEX uq_servicos_tipo_ref_ano ON public.servicos USING btree (tipo, referencia_tipo, referencia_id, ano_referencia);

-- --------------------------------------------------
-- Tabela: public.tipos_professor
-- --------------------------------------------------
CREATE TABLE public.tipos_professor (
  "id" integer NOT NULL DEFAULT nextval('tipos_professor_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text
);

-- Constraints
ALTER TABLE public.tipos_professor ADD CONSTRAINT tipos_professor_pkey PRIMARY KEY (id);
ALTER TABLE public.tipos_professor ADD CONSTRAINT tipos_professor_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX tipos_professor_codigo_key ON public.tipos_professor USING btree (codigo);
CREATE UNIQUE INDEX tipos_professor_pkey ON public.tipos_professor USING btree (id);

-- --------------------------------------------------
-- Tabela: public.tipos_vinculo_colaborador
-- --------------------------------------------------
CREATE TABLE public.tipos_vinculo_colaborador (
  "id" integer NOT NULL DEFAULT nextval('tipos_vinculo_colaborador_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "usa_jornada" boolean NOT NULL DEFAULT false,
  "usa_vigencia" boolean NOT NULL DEFAULT true,
  "eh_professor_por_natureza" boolean NOT NULL DEFAULT false,
  "gera_folha" boolean NOT NULL DEFAULT false,
  "exige_config_pagamento" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true
);

-- Constraints
ALTER TABLE public.tipos_vinculo_colaborador ADD CONSTRAINT tipos_vinculo_colaborador_pkey PRIMARY KEY (id);
ALTER TABLE public.tipos_vinculo_colaborador ADD CONSTRAINT tipos_vinculo_colaborador_codigo_key UNIQUE (codigo);

-- Indexes
CREATE UNIQUE INDEX tipos_vinculo_colaborador_codigo_key ON public.tipos_vinculo_colaborador USING btree (codigo);
CREATE UNIQUE INDEX tipos_vinculo_colaborador_pkey ON public.tipos_vinculo_colaborador USING btree (id);

-- --------------------------------------------------
-- Tabela: public.turma_aluno
-- --------------------------------------------------
CREATE TABLE public.turma_aluno (
  "turma_aluno_id" bigint NOT NULL DEFAULT nextval('turma_aluno_turma_aluno_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "aluno_pessoa_id" bigint NOT NULL,
  "dt_inicio" date DEFAULT CURRENT_DATE,
  "dt_fim" date,
  "status" text DEFAULT 'ativo'::text,
  "matricula_id" bigint
);

-- Constraints
ALTER TABLE public.turma_aluno ADD CONSTRAINT chk_turma_aluno_datas CHECK (((dt_fim IS NULL) OR (dt_fim >= dt_inicio)));
ALTER TABLE public.turma_aluno ADD CONSTRAINT turma_aluno_aluno_pessoa_id_fkey FOREIGN KEY (aluno_pessoa_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.turma_aluno ADD CONSTRAINT turma_aluno_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.turma_aluno ADD CONSTRAINT turma_aluno_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turma_aluno ADD CONSTRAINT turma_aluno_pkey PRIMARY KEY (turma_aluno_id);

-- Indexes
CREATE INDEX idx_turma_aluno_matricula ON public.turma_aluno USING btree (matricula_id);
CREATE INDEX idx_turma_aluno_pessoa ON public.turma_aluno USING btree (aluno_pessoa_id);
CREATE UNIQUE INDEX turma_aluno_pkey ON public.turma_aluno USING btree (turma_aluno_id);
CREATE UNIQUE INDEX uq_turma_aluno_aberta ON public.turma_aluno USING btree (turma_id, aluno_pessoa_id) WHERE (dt_fim IS NULL);

-- --------------------------------------------------
-- Tabela: public.turma_avaliacoes
-- --------------------------------------------------
CREATE TABLE public.turma_avaliacoes (
  "id" bigint NOT NULL DEFAULT nextval('turma_avaliacoes_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "avaliacao_modelo_id" bigint NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "data_prevista" date,
  "data_realizada" date,
  "status" text NOT NULL DEFAULT 'RASCUNHO'::text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.turma_avaliacoes ADD CONSTRAINT turma_avaliacoes_avaliacao_modelo_id_fkey FOREIGN KEY (avaliacao_modelo_id) REFERENCES avaliacoes_modelo(id) ON DELETE CASCADE;
ALTER TABLE public.turma_avaliacoes ADD CONSTRAINT turma_avaliacoes_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turma_avaliacoes ADD CONSTRAINT turma_avaliacoes_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX turma_avaliacoes_pkey ON public.turma_avaliacoes USING btree (id);

-- --------------------------------------------------
-- Tabela: public.turma_niveis
-- --------------------------------------------------
CREATE TABLE public.turma_niveis (
  "id" bigint NOT NULL DEFAULT nextval('turma_niveis_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "nivel_id" bigint NOT NULL,
  "principal" boolean NOT NULL DEFAULT false
);

-- Constraints
ALTER TABLE public.turma_niveis ADD CONSTRAINT turma_niveis_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES niveis(id);
ALTER TABLE public.turma_niveis ADD CONSTRAINT turma_niveis_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turma_niveis ADD CONSTRAINT turma_niveis_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX turma_niveis_pkey ON public.turma_niveis USING btree (id);
CREATE UNIQUE INDEX uq_turma_nivel_unico ON public.turma_niveis USING btree (turma_id, nivel_id);

-- --------------------------------------------------
-- Tabela: public.turma_professores
-- --------------------------------------------------
CREATE TABLE public.turma_professores (
  "id" bigint NOT NULL DEFAULT nextval('turma_professores_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "colaborador_id" bigint NOT NULL,
  "funcao_id" bigint NOT NULL,
  "principal" boolean NOT NULL DEFAULT false,
  "data_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "data_fim" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text
);

-- Constraints
ALTER TABLE public.turma_professores ADD CONSTRAINT turma_professores_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id);
ALTER TABLE public.turma_professores ADD CONSTRAINT turma_professores_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES funcoes_colaborador(id);
ALTER TABLE public.turma_professores ADD CONSTRAINT turma_professores_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turma_professores ADD CONSTRAINT turma_professores_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX idx_turma_professores_principal ON public.turma_professores USING btree (turma_id) WHERE ((principal = true) AND (data_fim IS NULL));
CREATE UNIQUE INDEX turma_professores_pkey ON public.turma_professores USING btree (id);
CREATE UNIQUE INDEX uq_turma_professores_principal ON public.turma_professores USING btree (turma_id) WHERE ((principal = true) AND (data_fim IS NULL));

-- --------------------------------------------------
-- Tabela: public.turmas
-- --------------------------------------------------
CREATE TABLE public.turmas (
  "turma_id" bigint NOT NULL DEFAULT nextval('turmas_turma_id_seq'::regclass),
  "nome" text NOT NULL,
  "curso" text,
  "nivel" text,
  "capacidade" integer,
  "dias_semana" text[],
  "hora_inicio" time without time zone,
  "hora_fim" time without time zone,
  "ativo" boolean DEFAULT true,
  "professor_id" bigint,
  "user_email" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "tipo_turma" text DEFAULT 'REGULAR'::text,
  "turno" text,
  "ano_referencia" integer,
  "data_inicio" date,
  "data_fim" date,
  "status" text DEFAULT 'EM_PREPARACAO'::text,
  "encerramento_automatico" boolean DEFAULT false,
  "periodo_letivo_id" bigint,
  "carga_horaria_prevista" numeric,
  "frequencia_minima_percentual" numeric,
  "observacoes" text,
  "idade_minima" integer,
  "idade_maxima" integer,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "espaco_id" bigint
);

-- Constraints
ALTER TABLE public.turmas ADD CONSTRAINT turmas_status_check CHECK ((status = ANY (ARRAY['EM_PREPARACAO'::text, 'ATIVA'::text, 'ENCERRADA'::text, 'CANCELADA'::text])));
ALTER TABLE public.turmas ADD CONSTRAINT turmas_tipo_turma_check CHECK ((tipo_turma = ANY (ARRAY['REGULAR'::text, 'CURSO_LIVRE'::text, 'ENSAIO'::text])));
ALTER TABLE public.turmas ADD CONSTRAINT turmas_turno_check CHECK ((turno = ANY (ARRAY['MANHA'::text, 'TARDE'::text, 'NOITE'::text, 'INTEGRAL'::text])));
ALTER TABLE public.turmas ADD CONSTRAINT turmas_espaco_id_fkey FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE RESTRICT;
ALTER TABLE public.turmas ADD CONSTRAINT turmas_pkey PRIMARY KEY (turma_id);

-- Indexes
CREATE INDEX idx_turmas_idade_maxima ON public.turmas USING btree (idade_maxima);
CREATE INDEX idx_turmas_idade_minima ON public.turmas USING btree (idade_minima);
CREATE INDEX turmas_espaco_id_idx ON public.turmas USING btree (espaco_id);
CREATE UNIQUE INDEX turmas_pkey ON public.turmas USING btree (turma_id);

-- --------------------------------------------------
-- Tabela: public.turmas_historico
-- --------------------------------------------------
CREATE TABLE public.turmas_historico (
  "id" bigint NOT NULL DEFAULT nextval('turmas_historico_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "ocorrida_em" timestamp with time zone NOT NULL DEFAULT now(),
  "actor_user_id" uuid,
  "evento" text NOT NULL,
  "resumo" text,
  "diff" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "snapshot" jsonb
);

-- Constraints
ALTER TABLE public.turmas_historico ADD CONSTRAINT turmas_historico_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turmas_historico ADD CONSTRAINT turmas_historico_pkey PRIMARY KEY (id);

-- Indexes
CREATE UNIQUE INDEX turmas_historico_pkey ON public.turmas_historico USING btree (id);
CREATE INDEX turmas_historico_turma_id_idx ON public.turmas_historico USING btree (turma_id, ocorrida_em DESC);

-- --------------------------------------------------
-- Tabela: public.turmas_horarios
-- --------------------------------------------------
CREATE TABLE public.turmas_horarios (
  "id" bigint NOT NULL DEFAULT nextval('turmas_horarios_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "day_of_week" smallint NOT NULL,
  "inicio" time without time zone NOT NULL,
  "fim" time without time zone NOT NULL
);

-- Constraints
ALTER TABLE public.turmas_horarios ADD CONSTRAINT turmas_horarios_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE public.turmas_horarios ADD CONSTRAINT turmas_horarios_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE;
ALTER TABLE public.turmas_horarios ADD CONSTRAINT turmas_horarios_pkey PRIMARY KEY (id);
ALTER TABLE public.turmas_horarios ADD CONSTRAINT turmas_horarios_turma_id_day_of_week_inicio_fim_key UNIQUE (turma_id, day_of_week, inicio, fim);

-- Indexes
CREATE UNIQUE INDEX turmas_horarios_pkey ON public.turmas_horarios USING btree (id);
CREATE UNIQUE INDEX turmas_horarios_turma_dia_uniq ON public.turmas_horarios USING btree (turma_id, day_of_week);
CREATE UNIQUE INDEX turmas_horarios_turma_id_day_of_week_inicio_fim_key ON public.turmas_horarios USING btree (turma_id, day_of_week, inicio, fim);
CREATE INDEX turmas_horarios_turma_id_idx ON public.turmas_horarios USING btree (turma_id);

-- --------------------------------------------------
-- Tabela: public.usuario_roles
-- --------------------------------------------------
CREATE TABLE public.usuario_roles (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.usuario_roles ADD CONSTRAINT usuario_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles_sistema(id) ON DELETE CASCADE;
ALTER TABLE public.usuario_roles ADD CONSTRAINT usuario_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.usuario_roles ADD CONSTRAINT usuario_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.usuario_roles ADD CONSTRAINT usuario_roles_user_id_role_id_key UNIQUE (user_id, role_id);

-- Indexes
CREATE UNIQUE INDEX usuario_roles_pkey ON public.usuario_roles USING btree (id);
CREATE UNIQUE INDEX usuario_roles_user_id_role_id_key ON public.usuario_roles USING btree (user_id, role_id);

-- --------------------------------------------------
-- Tabela: public.vinculos
-- --------------------------------------------------
CREATE TABLE public.vinculos (
  "id" bigint NOT NULL DEFAULT nextval('vinculos_id_seq'::regclass),
  "aluno_id" bigint NOT NULL,
  "responsavel_id" bigint NOT NULL,
  "parentesco" text
);

-- Constraints
ALTER TABLE public.vinculos ADD CONSTRAINT vinculos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES pessoas(id) ON DELETE CASCADE;
ALTER TABLE public.vinculos ADD CONSTRAINT vinculos_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES pessoas(id) ON DELETE CASCADE;
ALTER TABLE public.vinculos ADD CONSTRAINT vinculos_pkey PRIMARY KEY (id);
ALTER TABLE public.vinculos ADD CONSTRAINT vinculos_aluno_id_responsavel_id_key UNIQUE (aluno_id, responsavel_id);

-- Indexes
CREATE UNIQUE INDEX vinculos_aluno_id_responsavel_id_key ON public.vinculos USING btree (aluno_id, responsavel_id);
CREATE UNIQUE INDEX vinculos_pkey ON public.vinculos USING btree (id);

