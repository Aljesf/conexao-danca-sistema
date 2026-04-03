-- Snapshot do schema gerado em 2026-03-23T16:14:44.595Z
-- Fonte: SUPABASE_DB_URL

-- --------------------------------------------------
-- Tabela: public."aluno_grupo_membros"
-- --------------------------------------------------
CREATE TABLE public."aluno_grupo_membros" (
  "id" bigint NOT NULL DEFAULT nextval('aluno_grupo_membros_id_seq'::regclass),
  "grupo_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'ATIVO'::text,
  "data_entrada" date NOT NULL DEFAULT CURRENT_DATE,
  "data_saida" date,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."aluno_grupos"
-- --------------------------------------------------
CREATE TABLE public."aluno_grupos" (
  "id" bigint NOT NULL DEFAULT nextval('aluno_grupos_id_seq'::regclass),
  "nome" text NOT NULL,
  "categoria" text NOT NULL,
  "subcategoria" text,
  "tipo" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "data_inicio" date,
  "data_fim" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."alunos"
-- --------------------------------------------------
CREATE TABLE public."alunos" (
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

-- --------------------------------------------------
-- Tabela: public."alunos_turmas"
-- --------------------------------------------------
CREATE TABLE public."alunos_turmas" (
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

-- --------------------------------------------------
-- Tabela: public."app_config"
-- --------------------------------------------------
CREATE TABLE public."app_config" (
  "key" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."auditoria_logs"
-- --------------------------------------------------
CREATE TABLE public."auditoria_logs" (
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

-- --------------------------------------------------
-- Tabela: public."auditoria_migracao_conta_interna_cobrancas"
-- --------------------------------------------------
CREATE TABLE public."auditoria_migracao_conta_interna_cobrancas" (
  "id" bigint NOT NULL DEFAULT nextval('auditoria_migracao_conta_interna_cobrancas_id_seq'::regclass),
  "cobranca_id" bigint NOT NULL,
  "etapa" text NOT NULL,
  "classificacao_anterior" jsonb,
  "classificacao_nova" jsonb,
  "observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."auth_signup_allowlist"
-- --------------------------------------------------
CREATE TABLE public."auth_signup_allowlist" (
  "id" bigint NOT NULL DEFAULT nextval('auth_signup_allowlist_id_seq'::regclass),
  "email" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."avaliacao_aluno_resultado"
-- --------------------------------------------------
CREATE TABLE public."avaliacao_aluno_resultado" (
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

-- --------------------------------------------------
-- Tabela: public."avaliacoes_conceitos"
-- --------------------------------------------------
CREATE TABLE public."avaliacoes_conceitos" (
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

-- --------------------------------------------------
-- Tabela: public."avaliacoes_modelo"
-- --------------------------------------------------
CREATE TABLE public."avaliacoes_modelo" (
  "id" bigint NOT NULL DEFAULT nextval('avaliacoes_modelo_id_seq'::regclass),
  "nome" text NOT NULL,
  "descricao" text,
  "tipo_avaliacao" USER-DEFINED NOT NULL,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "grupos" jsonb NOT NULL,
  "conceitos_ids" ARRAY NOT NULL DEFAULT '{}'::bigint[],
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."bairros"
-- --------------------------------------------------
CREATE TABLE public."bairros" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "nome" text NOT NULL,
  "cidade" text,
  "estado" text,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."bolsa_concessoes"
-- --------------------------------------------------
CREATE TABLE public."bolsa_concessoes" (
  "id" bigint NOT NULL DEFAULT nextval('bolsa_concessoes_id_seq'::regclass),
  "projeto_social_id" bigint NOT NULL,
  "bolsa_tipo_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "matricula_id" bigint,
  "turma_id" bigint,
  "data_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "data_fim" date,
  "status" text NOT NULL DEFAULT 'ATIVA'::text,
  "motivo" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "projeto_social_beneficiario_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."bolsa_ledger"
-- --------------------------------------------------
CREATE TABLE public."bolsa_ledger" (
  "id" bigint NOT NULL DEFAULT nextval('bolsa_ledger_id_seq'::regclass),
  "competencia" text NOT NULL,
  "projeto_social_id" bigint NOT NULL,
  "bolsa_concessao_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "turma_id" bigint,
  "matricula_id" bigint,
  "origem_valor_contratado" text NOT NULL,
  "valor_contratado_centavos" integer NOT NULL,
  "valor_familia_centavos" integer NOT NULL,
  "valor_investimento_centavos" integer NOT NULL,
  "composicao_json" jsonb,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."bolsa_tipos"
-- --------------------------------------------------
CREATE TABLE public."bolsa_tipos" (
  "id" bigint NOT NULL DEFAULT nextval('bolsa_tipos_id_seq'::regclass),
  "projeto_social_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "modo" text NOT NULL,
  "percentual_desconto" numeric,
  "valor_final_familia_centavos" integer,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_categorias"
-- --------------------------------------------------
CREATE TABLE public."cafe_categorias" (
  "id" bigint NOT NULL DEFAULT nextval('cafe_categorias_id_seq'::regclass),
  "centro_custo_id" integer,
  "nome" text NOT NULL,
  "slug" text NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_compra_itens"
-- --------------------------------------------------
CREATE TABLE public."cafe_compra_itens" (
  "id" bigint NOT NULL,
  "compra_id" bigint NOT NULL,
  "insumo_id" bigint NOT NULL,
  "quantidade" numeric NOT NULL,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "custo_unitario_centavos" integer NOT NULL DEFAULT 0,
  "validade" date,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_compras"
-- --------------------------------------------------
CREATE TABLE public."cafe_compras" (
  "id" bigint NOT NULL,
  "centro_custo_id" bigint NOT NULL,
  "conta_financeira_id" bigint NOT NULL,
  "categoria_financeira_id" bigint,
  "onde_comprei" text NOT NULL,
  "data_compra" date NOT NULL DEFAULT CURRENT_DATE,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "movimento_financeiro_id" bigint,
  "observacoes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'ATIVA'::text,
  "cancelada_em" timestamp with time zone,
  "cancelada_por" uuid,
  "motivo_cancelamento" text
);

-- --------------------------------------------------
-- Tabela: public."cafe_insumo_movimentos"
-- --------------------------------------------------
CREATE TABLE public."cafe_insumo_movimentos" (
  "id" bigint NOT NULL,
  "insumo_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "quantidade" numeric NOT NULL,
  "custo_unitario_centavos" integer,
  "validade" date,
  "origem" text NOT NULL DEFAULT 'MANUAL'::text,
  "referencia_id" bigint,
  "observacoes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_insumos"
-- --------------------------------------------------
CREATE TABLE public."cafe_insumos" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "unidade_base" text NOT NULL,
  "controla_validade" boolean NOT NULL DEFAULT false,
  "validade_dias_padrao" integer,
  "custo_unitario_estimado_centavos" integer NOT NULL DEFAULT 0,
  "saldo_atual" numeric NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_produto_precos"
-- --------------------------------------------------
CREATE TABLE public."cafe_produto_precos" (
  "id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "tabela_preco_id" bigint NOT NULL,
  "preco_centavos" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_produto_receitas"
-- --------------------------------------------------
CREATE TABLE public."cafe_produto_receitas" (
  "id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "insumo_id" bigint NOT NULL,
  "quantidade" numeric NOT NULL,
  "unidade" text NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_produtos"
-- --------------------------------------------------
CREATE TABLE public."cafe_produtos" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "categoria" text NOT NULL DEFAULT 'GERAL'::text,
  "unidade_venda" text NOT NULL DEFAULT 'un'::text,
  "preco_venda_centavos" integer NOT NULL DEFAULT 0,
  "preparado" boolean NOT NULL DEFAULT true,
  "insumo_direto_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "categoria_id" bigint,
  "subcategoria_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."cafe_subcategorias"
-- --------------------------------------------------
CREATE TABLE public."cafe_subcategorias" (
  "id" bigint NOT NULL DEFAULT nextval('cafe_subcategorias_id_seq'::regclass),
  "categoria_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "slug" text NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_tabelas_preco"
-- --------------------------------------------------
CREATE TABLE public."cafe_tabelas_preco" (
  "id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "is_default" boolean NOT NULL DEFAULT false,
  "ordem" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cafe_venda_itens"
-- --------------------------------------------------
CREATE TABLE public."cafe_venda_itens" (
  "id" bigint NOT NULL,
  "venda_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "quantidade" numeric NOT NULL DEFAULT 1,
  "preco_unitario_centavos" integer NOT NULL DEFAULT 0,
  "total_centavos" integer NOT NULL DEFAULT 0,
  "descricao_snapshot" text,
  "valor_unitario_centavos" integer NOT NULL DEFAULT 0,
  "valor_total_centavos" integer NOT NULL DEFAULT 0
);

-- --------------------------------------------------
-- Tabela: public."cafe_vendas"
-- --------------------------------------------------
CREATE TABLE public."cafe_vendas" (
  "id" bigint NOT NULL,
  "pagador_pessoa_id" bigint,
  "consumidor_pessoa_id" bigint,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "forma_pagamento" text NOT NULL,
  "status_pagamento" text NOT NULL DEFAULT 'PENDENTE'::text,
  "cobranca_id" bigint,
  "observacoes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "tabela_preco_id" bigint,
  "data_operacao" date NOT NULL DEFAULT CURRENT_DATE,
  "data_competencia" text,
  "colaborador_pessoa_id" bigint,
  "tipo_quitacao" text NOT NULL DEFAULT 'IMEDIATA'::text,
  "valor_pago_centavos" integer NOT NULL DEFAULT 0,
  "valor_em_aberto_centavos" integer NOT NULL DEFAULT 0,
  "observacoes_internas" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."calendario_itens_institucionais"
-- --------------------------------------------------
CREATE TABLE public."calendario_itens_institucionais" (
  "id" bigint NOT NULL,
  "periodo_letivo_id" bigint,
  "dominio" text NOT NULL,
  "categoria" text NOT NULL,
  "subcategoria" text,
  "titulo" text NOT NULL,
  "descricao" text,
  "data_inicio" date NOT NULL,
  "data_fim" date,
  "sem_aula" boolean NOT NULL DEFAULT false,
  "ponto_facultativo" boolean NOT NULL DEFAULT false,
  "em_avaliacao" boolean NOT NULL DEFAULT false,
  "visibilidade" text NOT NULL DEFAULT 'ESCOLA'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "data_fim_eff" date NOT NULL DEFAULT CURRENT_DATE,
  "escopo" text
);

-- --------------------------------------------------
-- Tabela: public."cartao_bandeiras"
-- --------------------------------------------------
CREATE TABLE public."cartao_bandeiras" (
  "id" bigint NOT NULL DEFAULT nextval('cartao_bandeiras_id_seq'::regclass),
  "nome" text NOT NULL,
  "codigo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cartao_maquinas"
-- --------------------------------------------------
CREATE TABLE public."cartao_maquinas" (
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

-- --------------------------------------------------
-- Tabela: public."cartao_recebiveis"
-- --------------------------------------------------
CREATE TABLE public."cartao_recebiveis" (
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

-- --------------------------------------------------
-- Tabela: public."cartao_regras_operacao"
-- --------------------------------------------------
CREATE TABLE public."cartao_regras_operacao" (
  "id" bigint NOT NULL DEFAULT nextval('cartao_regras_operacao_id_seq'::regclass),
  "maquina_id" bigint NOT NULL,
  "bandeira_id" bigint NOT NULL,
  "tipo_transacao" text NOT NULL,
  "prazo_recebimento_dias" integer NOT NULL DEFAULT 30,
  "taxa_percentual" numeric NOT NULL DEFAULT 0,
  "taxa_fixa_centavos" integer NOT NULL DEFAULT 0,
  "permitir_parcelado" boolean NOT NULL DEFAULT true,
  "max_parcelas" integer NOT NULL DEFAULT 12,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."categorias_financeiras"
-- --------------------------------------------------
CREATE TABLE public."categorias_financeiras" (
  "id" integer NOT NULL DEFAULT nextval('categorias_financeiras_id_seq'::regclass),
  "tipo" text NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "plano_conta_id" integer
);

-- --------------------------------------------------
-- Tabela: public."centros_custo"
-- --------------------------------------------------
CREATE TABLE public."centros_custo" (
  "id" integer NOT NULL DEFAULT nextval('centros_custo_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "contextos_aplicaveis" ARRAY NOT NULL DEFAULT '{}'::text[]
);

-- --------------------------------------------------
-- Tabela: public."cobrancas"
-- --------------------------------------------------
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
  "juros_mora_percentual_mensal_aplicavel" numeric,
  "cancelada_em" timestamp with time zone,
  "cancelada_motivo" text,
  "cancelada_por_user_id" uuid,
  "expurgada" boolean DEFAULT false,
  "expurgada_em" timestamp with time zone,
  "expurgada_por" uuid,
  "expurgo_motivo" text,
  "origem_agrupador_tipo" text,
  "origem_agrupador_id" bigint,
  "origem_item_tipo" text,
  "origem_item_id" bigint,
  "conta_interna_id" bigint,
  "origem_label" text,
  "migracao_conta_interna_status" text,
  "migracao_conta_interna_observacao" text,
  "vencimento_original" date,
  "vencimento_ajustado_em" timestamp with time zone,
  "vencimento_ajustado_por" uuid,
  "vencimento_ajuste_motivo" text,
  "cancelada_por" uuid,
  "cancelamento_motivo" text,
  "cancelamento_tipo" text
);

-- --------------------------------------------------
-- Tabela: public."cobrancas_historico_eventos"
-- --------------------------------------------------
CREATE TABLE public."cobrancas_historico_eventos" (
  "id" bigint NOT NULL DEFAULT nextval('cobrancas_historico_eventos_id_seq'::regclass),
  "cobranca_id" bigint NOT NULL,
  "tipo_evento" text NOT NULL,
  "payload_anterior" jsonb,
  "payload_novo" jsonb,
  "observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."colaborador_config_financeira"
-- --------------------------------------------------
CREATE TABLE public."colaborador_config_financeira" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_config_financeira_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "gera_folha" boolean NOT NULL DEFAULT false,
  "dia_fechamento" integer NOT NULL DEFAULT 31,
  "dia_pagamento" integer NOT NULL DEFAULT 5,
  "pagamento_no_mes_seguinte" boolean NOT NULL DEFAULT true,
  "politica_desconto_cartao" text NOT NULL DEFAULT 'DESCONTA_NA_FOLHA'::text,
  "politica_corte_cartao" text NOT NULL DEFAULT 'POR_DIA_FECHAMENTO'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "salario_base_centavos" integer NOT NULL DEFAULT 0,
  "tipo_remuneracao" text NOT NULL DEFAULT 'MENSAL'::text,
  "valor_hora_centavos" integer NOT NULL DEFAULT 0,
  "centro_custo_id" integer
);

-- --------------------------------------------------
-- Tabela: public."colaborador_funcoes"
-- --------------------------------------------------
CREATE TABLE public."colaborador_funcoes" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_funcoes_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "funcao_id" integer NOT NULL,
  "principal" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."colaborador_jornada"
-- --------------------------------------------------
CREATE TABLE public."colaborador_jornada" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_jornada_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "tipo_vinculo_id" integer,
  "inicio_vigencia" date NOT NULL,
  "fim_vigencia" date,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."colaborador_jornada_dias"
-- --------------------------------------------------
CREATE TABLE public."colaborador_jornada_dias" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_jornada_dias_id_seq'::regclass),
  "jornada_id" bigint NOT NULL,
  "dia_semana" text NOT NULL,
  "entrada_1" time without time zone,
  "saida_1" time without time zone,
  "entrada_2" time without time zone,
  "saida_2" time without time zone,
  "ativo" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."colaborador_pagamentos"
-- --------------------------------------------------
CREATE TABLE public."colaborador_pagamentos" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_pagamentos_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "competencia_ano_mes" text,
  "data_pagamento" date NOT NULL,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "conta_financeira_id" bigint,
  "observacoes" text,
  "folha_pagamento_colaborador_id" bigint,
  "folha_evento_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."colaborador_remuneracoes"
-- --------------------------------------------------
CREATE TABLE public."colaborador_remuneracoes" (
  "id" bigint NOT NULL DEFAULT nextval('colaborador_remuneracoes_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "vigencia_inicio" date NOT NULL,
  "vigencia_fim" date,
  "salario_base_centavos" integer NOT NULL DEFAULT 0,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "dia_pagamento_padrao" smallint,
  "conta_financeira_padrao_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."colaboradores"
-- --------------------------------------------------
CREATE TABLE public."colaboradores" (
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

-- --------------------------------------------------
-- Tabela: public."config_pagamento_colaborador"
-- --------------------------------------------------
CREATE TABLE public."config_pagamento_colaborador" (
  "id" bigint NOT NULL DEFAULT nextval('config_pagamento_colaborador_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "funcao_id" integer,
  "modelo_pagamento_id" integer NOT NULL,
  "valor_centavos" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text
);

-- --------------------------------------------------
-- Tabela: public."contas_financeiras"
-- --------------------------------------------------
CREATE TABLE public."contas_financeiras" (
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

-- --------------------------------------------------
-- Tabela: public."contas_pagar"
-- --------------------------------------------------
CREATE TABLE public."contas_pagar" (
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

-- --------------------------------------------------
-- Tabela: public."contas_pagar_pagamentos"
-- --------------------------------------------------
CREATE TABLE public."contas_pagar_pagamentos" (
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

-- --------------------------------------------------
-- Tabela: public."contratos_emitidos"
-- --------------------------------------------------
CREATE TABLE public."contratos_emitidos" (
  "id" bigint NOT NULL,
  "matricula_id" bigint NOT NULL,
  "contrato_modelo_id" bigint NOT NULL,
  "status_assinatura" text NOT NULL DEFAULT 'PENDENTE'::text,
  "conteudo_renderizado_md" text NOT NULL,
  "variaveis_utilizadas_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "snapshot_financeiro_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "hash_conteudo" text,
  "pdf_url" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."contratos_emitidos_termos"
-- --------------------------------------------------
CREATE TABLE public."contratos_emitidos_termos" (
  "contrato_emitido_id" bigint NOT NULL,
  "termo_modelo_id" bigint NOT NULL,
  "versao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."contratos_modelo"
-- --------------------------------------------------
CREATE TABLE public."contratos_modelo" (
  "id" bigint NOT NULL,
  "tipo_contrato" text NOT NULL,
  "titulo" text NOT NULL,
  "versao" text NOT NULL DEFAULT 'v1.0'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "texto_modelo_md" text NOT NULL,
  "placeholders_schema_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."coreografia_estilos"
-- --------------------------------------------------
CREATE TABLE public."coreografia_estilos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "slug" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem_exibicao" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."coreografia_formacoes"
-- --------------------------------------------------
CREATE TABLE public."coreografia_formacoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "quantidade_minima_padrao" integer NOT NULL,
  "quantidade_maxima_padrao" integer NOT NULL,
  "quantidade_fixa" boolean NOT NULL DEFAULT false,
  "ativa" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."coreografias"
-- --------------------------------------------------
CREATE TABLE public."coreografias" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "descricao" text,
  "modalidade" text,
  "tipo_formacao" USER-DEFINED NOT NULL DEFAULT 'LIVRE'::coreografia_formacao_enum,
  "quantidade_minima_participantes" integer NOT NULL DEFAULT 1,
  "quantidade_maxima_participantes" integer NOT NULL DEFAULT 20,
  "duracao_estimada_segundos" integer,
  "sugestao_musica" text,
  "link_musica" text,
  "professor_responsavel_id" bigint,
  "turma_base_id" bigint,
  "observacoes" text,
  "ativa" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "estilo_id" uuid NOT NULL,
  "formacao_id" uuid NOT NULL
);

-- --------------------------------------------------
-- Tabela: public."credito_conexao_configuracoes"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_configuracoes" (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_configuracoes_id_seq'::regclass),
  "tipo_conta" text NOT NULL,
  "dia_fechamento" integer NOT NULL,
  "dia_vencimento" integer NOT NULL,
  "tolerancia_dias" integer NOT NULL DEFAULT 0,
  "multa_percentual" numeric NOT NULL DEFAULT 0,
  "juros_dia_percentual" numeric NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."credito_conexao_contas"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_contas" (
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
  "categoria_taxas_id" integer,
  "dia_vencimento_preferido" smallint,
  "responsavel_financeiro_pessoa_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."credito_conexao_fatura_lancamentos"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_fatura_lancamentos" (
  "fatura_id" bigint NOT NULL,
  "lancamento_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
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
-- Tabela: public."credito_conexao_faturas_cobrancas_avulsas"
-- --------------------------------------------------
CREATE TABLE public."credito_conexao_faturas_cobrancas_avulsas" (
  "id" bigint NOT NULL DEFAULT nextval('credito_conexao_faturas_cobrancas_avulsas_id_seq'::regclass),
  "fatura_id" bigint NOT NULL,
  "cobranca_avulsa_id" bigint NOT NULL,
  "confirmado_competencia_diferente" boolean NOT NULL DEFAULT false,
  "criado_por_user_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------
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
  "numero_parcelas" integer,
  "competencia" text,
  "referencia_item" text,
  "composicao_json" jsonb,
  "cobranca_id" bigint,
  "aluno_id" bigint,
  "matricula_id" bigint,
  "centro_custo_id" bigint
);

-- --------------------------------------------------
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
-- Tabela: public."curriculo_experiencias_artisticas"
-- --------------------------------------------------
CREATE TABLE public."curriculo_experiencias_artisticas" (
  "id" bigint NOT NULL DEFAULT nextval('curriculo_experiencias_artisticas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "titulo" text NOT NULL,
  "papel" text,
  "organizacao" text,
  "data_evento" date,
  "descricao" text,
  "comprovante_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."curriculo_formacoes_externas"
-- --------------------------------------------------
CREATE TABLE public."curriculo_formacoes_externas" (
  "id" bigint NOT NULL DEFAULT nextval('curriculo_formacoes_externas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "nome_curso" text NOT NULL,
  "organizacao" text,
  "local" text,
  "carga_horaria" text,
  "data_inicio" date,
  "data_fim" date,
  "certificado_url" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."curriculos_institucionais"
-- --------------------------------------------------
CREATE TABLE public."curriculos_institucionais" (
  "id" bigint NOT NULL DEFAULT nextval('curriculos_institucionais_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "tipo_curriculo" text NOT NULL,
  "habilitado" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cursos"
-- --------------------------------------------------
CREATE TABLE public."cursos" (
  "id" bigint NOT NULL DEFAULT nextval('cursos_id_seq'::regclass),
  "nome" text NOT NULL,
  "metodologia" text,
  "situacao" text NOT NULL DEFAULT 'Ativo'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."cursos_livres"
-- --------------------------------------------------
CREATE TABLE public."cursos_livres" (
  "id" bigint NOT NULL DEFAULT nextval('cursos_livres_id_seq'::regclass),
  "nome" text NOT NULL,
  "classificacao" text NOT NULL DEFAULT 'WORKSHOP'::text,
  "descricao" text,
  "publico_alvo" text,
  "data_inicio" date,
  "data_fim" date,
  "status" text NOT NULL DEFAULT 'RASCUNHO'::text,
  "idade_minima" integer,
  "idade_maxima" integer,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."debug_vercel_pings"
-- --------------------------------------------------
CREATE TABLE public."debug_vercel_pings" (
  "id" bigint NOT NULL DEFAULT nextval('debug_vercel_pings_id_seq'::regclass),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "source" text NOT NULL,
  "payload" jsonb
);

-- --------------------------------------------------
-- Tabela: public."documentos_cabecalhos"
-- --------------------------------------------------
CREATE TABLE public."documentos_cabecalhos" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_cabecalhos_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "html_template" text NOT NULL,
  "css_template" text,
  "config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "layout_template_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_colecoes"
-- --------------------------------------------------
CREATE TABLE public."documentos_colecoes" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_colecoes_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "root_tipo" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_colecoes_colunas"
-- --------------------------------------------------
CREATE TABLE public."documentos_colecoes_colunas" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_colecoes_colunas_id_seq'::regclass),
  "colecao_id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "label" text NOT NULL,
  "tipo" text NOT NULL,
  "formato" text,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_conjuntos"
-- --------------------------------------------------
CREATE TABLE public."documentos_conjuntos" (
  "id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_conjuntos_grupos"
-- --------------------------------------------------
CREATE TABLE public."documentos_conjuntos_grupos" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_conjuntos_grupos_id_seq'::regclass),
  "conjunto_id" bigint,
  "grupo_id" bigint,
  "ordem" integer DEFAULT 0,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_conjuntos_grupos_modelos"
-- --------------------------------------------------
CREATE TABLE public."documentos_conjuntos_grupos_modelos" (
  "grupo_modelo_id" bigint NOT NULL DEFAULT nextval('documentos_conjuntos_grupos_modelos_grupo_modelo_id_seq'::regclass),
  "conjunto_grupo_id" bigint NOT NULL,
  "modelo_id" bigint NOT NULL,
  "ordem" integer NOT NULL DEFAULT 1,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."documentos_emitidos"
-- --------------------------------------------------
CREATE TABLE public."documentos_emitidos" (
  "id" bigint NOT NULL,
  "matricula_id" bigint NOT NULL,
  "contrato_modelo_id" bigint NOT NULL,
  "status_assinatura" text NOT NULL DEFAULT 'PENDENTE'::text,
  "conteudo_renderizado_md" text NOT NULL,
  "variaveis_utilizadas_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "snapshot_financeiro_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "hash_conteudo" text,
  "pdf_url" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "documento_conjunto_id" bigint,
  "documento_grupo_id" bigint,
  "conteudo_template_html" text,
  "conteudo_resolvido_html" text,
  "contexto_json" jsonb,
  "editado_manual" boolean NOT NULL DEFAULT false,
  "cabecalho_html" text,
  "rodape_html" text,
  "header_html" text,
  "footer_html" text,
  "header_height_px" integer NOT NULL DEFAULT 120,
  "footer_height_px" integer NOT NULL DEFAULT 80,
  "page_margin_mm" integer NOT NULL DEFAULT 15,
  "recebimento_id" bigint,
  "operacao_id" bigint,
  "origem_tipo" text,
  "origem_id" text,
  "documento_origem_id" bigint,
  "motivo_reemissao" text,
  "tipo_relacao_documental" text NOT NULL DEFAULT 'ORIGINAL'::text
);

-- --------------------------------------------------
-- Tabela: public."documentos_emitidos_termos"
-- --------------------------------------------------
CREATE TABLE public."documentos_emitidos_termos" (
  "contrato_emitido_id" bigint NOT NULL,
  "termo_modelo_id" bigint NOT NULL,
  "versao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_grupos"
-- --------------------------------------------------
CREATE TABLE public."documentos_grupos" (
  "id" bigint NOT NULL,
  "conjunto_id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "obrigatorio" boolean NOT NULL DEFAULT false,
  "ordem" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "papel" text,
  "ativo" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."documentos_imagens"
-- --------------------------------------------------
CREATE TABLE public."documentos_imagens" (
  "imagem_id" bigint NOT NULL DEFAULT nextval('documentos_imagens_imagem_id_seq'::regclass),
  "nome" text NOT NULL,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "bucket" text NOT NULL DEFAULT 'documentos-imagens'::text,
  "path" text NOT NULL,
  "public_url" text NOT NULL,
  "largura" integer,
  "altura" integer,
  "mime_type" text,
  "tamanho_bytes" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."documentos_layout_templates"
-- --------------------------------------------------
CREATE TABLE public."documentos_layout_templates" (
  "layout_template_id" bigint NOT NULL DEFAULT nextval('documentos_layout_templates_layout_template_id_seq'::regclass),
  "tipo" text NOT NULL,
  "nome" text NOT NULL,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "html" text NOT NULL DEFAULT ''::text,
  "height_px" integer NOT NULL DEFAULT 120,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."documentos_layouts"
-- --------------------------------------------------
CREATE TABLE public."documentos_layouts" (
  "layout_id" bigint NOT NULL DEFAULT nextval('documentos_layouts_layout_id_seq'::regclass),
  "nome" text NOT NULL,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "cabecalho_html" text,
  "rodape_html" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."documentos_modelo"
-- --------------------------------------------------
CREATE TABLE public."documentos_modelo" (
  "id" bigint NOT NULL,
  "titulo" text NOT NULL,
  "versao" text NOT NULL DEFAULT 'v1.0'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "texto_modelo_md" text NOT NULL,
  "placeholders_schema_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "formato" text NOT NULL DEFAULT 'MARKDOWN'::text,
  "conteudo_html" text,
  "tipo_documento_id" bigint,
  "cabecalho_html" text,
  "rodape_html" text,
  "ai_source_text" text,
  "ai_sugestoes_json" jsonb,
  "ai_updated_at" timestamp with time zone,
  "layout_id" bigint,
  "header_template_id" bigint,
  "footer_template_id" bigint,
  "header_height_px" integer NOT NULL DEFAULT 120,
  "footer_height_px" integer NOT NULL DEFAULT 80,
  "page_margin_mm" integer NOT NULL DEFAULT 15,
  "operacao_id" bigint,
  "cabecalho_id" bigint,
  "rodape_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."documentos_operacoes"
-- --------------------------------------------------
CREATE TABLE public."documentos_operacoes" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_operacoes_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "tipo_documento_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "exige_origem" boolean NOT NULL DEFAULT true,
  "permite_reemissao" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_operacoes_conjuntos"
-- --------------------------------------------------
CREATE TABLE public."documentos_operacoes_conjuntos" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_operacoes_conjuntos_id_seq'::regclass),
  "operacao_id" bigint NOT NULL,
  "conjunto_id" bigint NOT NULL,
  "ordem" integer NOT NULL DEFAULT 1,
  "obrigatorio" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_rodapes"
-- --------------------------------------------------
CREATE TABLE public."documentos_rodapes" (
  "id" bigint NOT NULL DEFAULT nextval('documentos_rodapes_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "html_template" text NOT NULL,
  "css_template" text,
  "config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "layout_template_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."documentos_tipos"
-- --------------------------------------------------
CREATE TABLE public."documentos_tipos" (
  "tipo_documento_id" bigint NOT NULL DEFAULT nextval('documentos_tipos_tipo_documento_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."documentos_variaveis"
-- --------------------------------------------------
CREATE TABLE public."documentos_variaveis" (
  "id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "descricao" text NOT NULL,
  "origem" text NOT NULL,
  "tipo" text NOT NULL,
  "path_origem" text,
  "formato" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "root_table" text,
  "root_pk_column" text,
  "join_path" jsonb,
  "target_table" text,
  "target_column" text,
  "display_label" text,
  "path_labels" jsonb,
  "ai_gerada" boolean NOT NULL DEFAULT false,
  "mapeamento_pendente" boolean NOT NULL DEFAULT false
);

-- --------------------------------------------------
-- Tabela: public."endereco"
-- --------------------------------------------------
CREATE TABLE public."endereco" (
  "endereco_id" bigint NOT NULL DEFAULT nextval('endereco_endereco_id_seq'::regclass),
  "logradouro" text,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "cidade" text,
  "uf" text,
  "cep" text
);

-- --------------------------------------------------
-- Tabela: public."enderecos"
-- --------------------------------------------------
CREATE TABLE public."enderecos" (
  "id" bigint NOT NULL DEFAULT nextval('enderecos_id_seq'::regclass),
  "logradouro" text NOT NULL,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "cidade" text NOT NULL,
  "uf" character NOT NULL,
  "cep" text,
  "referencia" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone,
  "cidade_id" bigint,
  "bairro_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."enderecos_bairros"
-- --------------------------------------------------
CREATE TABLE public."enderecos_bairros" (
  "id" bigint NOT NULL DEFAULT nextval('enderecos_bairros_id_seq'::regclass),
  "cidade_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."enderecos_cidades"
-- --------------------------------------------------
CREATE TABLE public."enderecos_cidades" (
  "id" bigint NOT NULL DEFAULT nextval('enderecos_cidades_id_seq'::regclass),
  "nome" text NOT NULL,
  "uf" text NOT NULL DEFAULT 'PA'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."enderecos_pessoa"
-- --------------------------------------------------
CREATE TABLE public."enderecos_pessoa" (
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

-- --------------------------------------------------
-- Tabela: public."escola_config_financeira"
-- --------------------------------------------------
CREATE TABLE public."escola_config_financeira" (
  "id" integer NOT NULL,
  "centro_custo_padrao_escola_id" bigint,
  "centro_custo_intermediacao_financeira_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."escola_contextos_matricula"
-- --------------------------------------------------
CREATE TABLE public."escola_contextos_matricula" (
  "id" bigint NOT NULL DEFAULT nextval('escola_contextos_matricula_id_seq'::regclass),
  "tipo" text NOT NULL,
  "titulo" text NOT NULL,
  "ano_referencia" integer,
  "data_inicio" date,
  "data_fim" date,
  "status" text NOT NULL DEFAULT 'ATIVO'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."escola_produtos_educacionais"
-- --------------------------------------------------
CREATE TABLE public."escola_produtos_educacionais" (
  "id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "titulo" text NOT NULL,
  "curso_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "tier_grupo_id" bigint,
  "contexto_matricula_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."escola_tabelas_precos_cursos"
-- --------------------------------------------------
CREATE TABLE public."escola_tabelas_precos_cursos" (
  "id" bigint NOT NULL,
  "titulo" text NOT NULL,
  "ano_referencia" integer,
  "referencia_tipo" text,
  "referencia_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."escola_tabelas_precos_cursos_itens"
-- --------------------------------------------------
CREATE TABLE public."escola_tabelas_precos_cursos_itens" (
  "id" bigint NOT NULL,
  "tabela_id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "descricao" text,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."escola_unidades_execucao"
-- --------------------------------------------------
CREATE TABLE public."escola_unidades_execucao" (
  "unidade_execucao_id" bigint NOT NULL,
  "servico_id" bigint NOT NULL,
  "denominacao" text NOT NULL,
  "nome" text NOT NULL,
  "origem_tipo" text NOT NULL,
  "origem_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."espacos"
-- --------------------------------------------------
CREATE TABLE public."espacos" (
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

-- --------------------------------------------------
-- Tabela: public."eventos_escola"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "titulo" text NOT NULL,
  "descricao" text,
  "tipo_evento" USER-DEFINED NOT NULL,
  "natureza_evento" USER-DEFINED NOT NULL,
  "abrangencia_evento" USER-DEFINED NOT NULL,
  "contexto" text NOT NULL DEFAULT 'ESCOLA'::text,
  "centro_custo_codigo" text NOT NULL DEFAULT 'ESCOLA'::text,
  "publico_alvo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_contratacoes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_contratacoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "sessao_id" uuid,
  "prestador_pessoa_id" bigint,
  "tipo_servico" text NOT NULL,
  "descricao" text,
  "valor_previsto_centavos" integer NOT NULL DEFAULT 0,
  "valor_contratado_centavos" integer,
  "contrato_acessorio_emitido_id" bigint,
  "conta_pagar_id" bigint,
  "status" USER-DEFINED NOT NULL DEFAULT 'RASCUNHO'::evento_contratacao_status_enum,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_coreografia_participantes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_coreografia_participantes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "coreografia_id" uuid NOT NULL,
  "pessoa_id" bigint,
  "papel" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "aluno_id" bigint,
  "inscricao_id" uuid,
  "tipo_participante" text NOT NULL DEFAULT 'PESSOA'::text,
  "ordem_interna" integer,
  "ativo" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_coreografias"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_coreografias" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "subevento_id" uuid,
  "titulo" text NOT NULL,
  "categoria" text,
  "estilo" text,
  "professor_responsavel_id" bigint,
  "turma_base_id" bigint,
  "duracao_estimada_segundos" integer,
  "ordem_apresentacao" integer,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "descricao" text,
  "tipo_formacao" USER-DEFINED NOT NULL DEFAULT 'LIVRE'::evento_coreografia_formacao_enum,
  "quantidade_minima_participantes" integer NOT NULL DEFAULT 1,
  "quantidade_maxima_participantes" integer NOT NULL DEFAULT 20,
  "sugestao_musica" text,
  "link_musica" text,
  "valor_participacao_coreografia_centavos" integer,
  "ativa" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_dias"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_dias" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "data_evento" date NOT NULL,
  "titulo" text,
  "ordem" integer,
  "status" USER-DEFINED NOT NULL DEFAULT 'PLANEJADO'::evento_dia_status_enum,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_calendario_itens"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_calendario_itens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "tipo" USER-DEFINED NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "inicio" timestamp with time zone NOT NULL,
  "fim" timestamp with time zone,
  "dia_inteiro" boolean NOT NULL DEFAULT false,
  "local_nome" text,
  "cidade" text,
  "endereco" text,
  "reflete_no_calendario_escola" boolean NOT NULL DEFAULT false,
  "turma_id" bigint,
  "grupo_id" bigint,
  "ordem" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_configuracoes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_configuracoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "cobra_taxa_participacao_geral" boolean NOT NULL DEFAULT false,
  "cobra_por_coreografia" boolean NOT NULL DEFAULT false,
  "cobra_por_pacote" boolean NOT NULL DEFAULT false,
  "permite_itens_adicionais" boolean NOT NULL DEFAULT false,
  "participacao_por_aluno" boolean NOT NULL DEFAULT true,
  "participacao_por_turma" boolean NOT NULL DEFAULT false,
  "participacao_por_grupo" boolean NOT NULL DEFAULT false,
  "participacao_por_coreografia" boolean NOT NULL DEFAULT true,
  "permite_multiplas_coreografias_aluno" boolean NOT NULL DEFAULT false,
  "valor_taxa_participacao_centavos" integer NOT NULL DEFAULT 0,
  "modo_composicao_valor" text NOT NULL DEFAULT 'VALOR_FIXO'::text,
  "modo_cobranca" text NOT NULL DEFAULT 'UNICA'::text,
  "quantidade_maxima_parcelas" integer NOT NULL DEFAULT 1,
  "gera_conta_interna_automaticamente" boolean NOT NULL DEFAULT false,
  "regras_adicionais" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "permite_pagamento_no_ato" boolean NOT NULL DEFAULT true,
  "permite_conta_interna" boolean NOT NULL DEFAULT true,
  "exige_inscricao_geral" boolean NOT NULL DEFAULT true,
  "permite_inscricao_por_coreografia" boolean NOT NULL DEFAULT true,
  "permite_vincular_coreografia_depois" boolean NOT NULL DEFAULT true,
  "permite_parcelamento_conta_interna" boolean NOT NULL DEFAULT false,
  "maximo_parcelas_conta_interna" integer NOT NULL DEFAULT 1,
  "competencias_elegiveis_conta_interna" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "permite_competencias_apos_evento" boolean NOT NULL DEFAULT false,
  "dia_corte_operacional_parcelamento" integer
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_coreografia_elenco"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_coreografia_elenco" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_coreografia_id" uuid NOT NULL,
  "aluno_id" bigint,
  "pessoa_id" bigint,
  "inscricao_id" uuid,
  "tipo_participante" text,
  "ordem_interna" integer,
  "papel" text,
  "observacao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_coreografias"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_coreografias" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "coreografia_id" uuid NOT NULL,
  "subevento_id" uuid,
  "ordem_prevista_apresentacao" integer,
  "valor_participacao_coreografia_centavos" integer,
  "duracao_prevista_no_evento_segundos" integer,
  "observacoes_do_evento" text,
  "ativa" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_itens_financeiros"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_itens_financeiros" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "codigo" text,
  "nome" text NOT NULL,
  "descricao" text,
  "tipo_item" text NOT NULL,
  "modo_cobranca" text NOT NULL DEFAULT 'UNICO'::text,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicao_regras_financeiras"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicao_regras_financeiras" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "tipo_regra" text NOT NULL,
  "modo_calculo" text NOT NULL DEFAULT 'VALOR_FIXO'::text,
  "descricao_regra" text,
  "formacao_coreografia" text,
  "estilo_id" uuid,
  "modalidade_nome" text,
  "ordem_progressao" integer,
  "quantidade_minima" integer,
  "quantidade_maxima" integer,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "valor_por_participante_centavos" integer,
  "ativa" boolean NOT NULL DEFAULT true,
  "ordem_aplicacao" integer NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_edicoes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_edicoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "evento_id" uuid NOT NULL,
  "titulo_exibicao" text NOT NULL,
  "tema" text,
  "ano_referencia" integer NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'EM_PLANEJAMENTO'::evento_status_enum,
  "data_inicio" timestamp with time zone,
  "data_fim" timestamp with time zone,
  "local_principal_nome" text,
  "local_principal_endereco" text,
  "local_principal_cidade" text,
  "regulamento_resumo" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "descricao" text
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_financeiro_referencias"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_financeiro_referencias" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "sessao_id" uuid,
  "natureza" USER-DEFINED NOT NULL,
  "origem_tipo" USER-DEFINED NOT NULL,
  "origem_id" bigint,
  "pessoa_id" bigint,
  "descricao" text,
  "valor_previsto_centavos" integer,
  "valor_real_centavos" integer,
  "conta_interna_id" bigint,
  "cobranca_id" bigint,
  "recebimento_id" bigint,
  "conta_pagar_id" bigint,
  "pagamento_conta_pagar_id" bigint,
  "movimento_financeiro_id" bigint,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_inscricao_item_movimentos_financeiros"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_inscricao_item_movimentos_financeiros" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "inscricao_id" uuid NOT NULL,
  "inscricao_item_id" uuid NOT NULL,
  "tipo_movimento" text NOT NULL DEFAULT 'CONSTITUICAO'::text,
  "destino_financeiro" USER-DEFINED NOT NULL,
  "competencia" text,
  "parcela_numero" integer,
  "total_parcelas" integer,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "conta_interna_id" bigint,
  "cobranca_id" bigint,
  "cobranca_avulsa_id" bigint,
  "recebimento_id" bigint,
  "lancamento_conta_interna_id" bigint,
  "fatura_conta_interna_id" bigint,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_inscricao_itens"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_inscricao_itens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "inscricao_id" uuid NOT NULL,
  "modalidade_id" uuid,
  "subevento_id" uuid,
  "descricao" text,
  "quantidade" integer NOT NULL DEFAULT 1,
  "valor_unitario_centavos" integer NOT NULL DEFAULT 0,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "obrigatorio" boolean NOT NULL DEFAULT false,
  "origem_financeira" text NOT NULL DEFAULT 'EVENTO_ESCOLA'::text,
  "lancamento_conta_interna_id" bigint,
  "status" USER-DEFINED NOT NULL DEFAULT 'ATIVO'::evento_inscricao_item_status_enum,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "tipo_item" USER-DEFINED NOT NULL DEFAULT 'ITEM_EDICAO'::eventos_escola_inscricao_item_tipo_enum,
  "item_configuracao_id" uuid,
  "coreografia_vinculo_id" uuid,
  "descricao_snapshot" text,
  "origem_item" USER-DEFINED NOT NULL DEFAULT 'INSCRICAO_INICIAL'::eventos_escola_inscricao_item_origem_enum,
  "cancelado_em" timestamp with time zone,
  "motivo_cancelamento" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_inscricao_parcelas_conta_interna"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_inscricao_parcelas_conta_interna" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "inscricao_id" uuid NOT NULL,
  "parcela_numero" integer NOT NULL,
  "total_parcelas" integer NOT NULL,
  "competencia" text NOT NULL,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "conta_interna_id" bigint NOT NULL,
  "cobranca_id" bigint,
  "lancamento_conta_interna_id" bigint,
  "fatura_conta_interna_id" bigint,
  "status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_inscricoes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_inscricoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "aluno_pessoa_id" bigint,
  "responsavel_financeiro_id" bigint,
  "conta_interna_id" bigint,
  "status_inscricao" USER-DEFINED NOT NULL DEFAULT 'RASCUNHO'::evento_inscricao_status_enum,
  "status_financeiro" USER-DEFINED NOT NULL DEFAULT 'NAO_GERADO'::evento_financeiro_status_enum,
  "data_inscricao" timestamp with time zone NOT NULL DEFAULT now(),
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "origem_inscricao" USER-DEFINED NOT NULL DEFAULT 'INSCRICAO_INTERNA'::eventos_escola_origem_inscricao_enum,
  "participante_externo_id" uuid,
  "destino_financeiro" USER-DEFINED NOT NULL DEFAULT 'CONTA_INTERNA'::eventos_escola_destino_financeiro_enum,
  "gerar_em_conta_interna" boolean NOT NULL DEFAULT false,
  "pagamento_no_ato" boolean NOT NULL DEFAULT false,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "cobranca_id" bigint,
  "cobranca_avulsa_id" bigint,
  "recebimento_id" bigint,
  "lancamento_conta_interna_id" bigint,
  "fatura_conta_interna_id" bigint,
  "forma_pagamento_codigo" text,
  "participante_nome_snapshot" text,
  "quantidade_parcelas_conta_interna" integer NOT NULL DEFAULT 1
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_locais"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_locais" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "nome_local" text NOT NULL,
  "endereco" text,
  "cidade" text,
  "observacoes" text,
  "principal" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_modalidade_precos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_modalidade_precos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "modalidade_id" uuid NOT NULL,
  "titulo" text,
  "valor_centavos" integer NOT NULL,
  "vigencia_inicio" date,
  "vigencia_fim" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_modalidades"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_modalidades" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "codigo" text,
  "nome" text NOT NULL,
  "tipo_modalidade" USER-DEFINED NOT NULL,
  "descricao" text,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "permite_multiplas_unidades" boolean NOT NULL DEFAULT false,
  "quantidade_minima" integer,
  "quantidade_maxima" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_participantes_externos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_participantes_externos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pessoa_id" bigint NOT NULL,
  "responsavel_nome" text,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "documento" text
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_assentos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_assentos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "setor_id" uuid NOT NULL,
  "codigo" text NOT NULL,
  "linha" text,
  "numero" text,
  "ordem" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_atividades"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_atividades" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessao_id" uuid NOT NULL,
  "local_id" uuid,
  "tipo_atividade" USER-DEFINED NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "inicio" timestamp with time zone,
  "fim" timestamp with time zone,
  "ordem" integer,
  "aberta_ao_publico" boolean NOT NULL DEFAULT false,
  "coreografia_id" uuid,
  "turma_id" bigint,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_ingresso_lotes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_ingresso_lotes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "ingresso_tipo_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "quantidade" integer,
  "inicio_vendas" timestamp with time zone,
  "fim_vendas" timestamp with time zone,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_ingresso_pedidos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_ingresso_pedidos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessao_id" uuid NOT NULL,
  "comprador_pessoa_id" bigint,
  "responsavel_financeiro_id" bigint,
  "status" USER-DEFINED NOT NULL DEFAULT 'RASCUNHO'::evento_ingresso_pedido_status_enum,
  "valor_total_centavos" integer NOT NULL DEFAULT 0,
  "cobranca_id" bigint,
  "recebimento_id" bigint,
  "expira_em" timestamp with time zone,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_ingresso_tipos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_ingresso_tipos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessao_id" uuid NOT NULL,
  "setor_id" uuid,
  "codigo" text,
  "nome" text NOT NULL,
  "descricao" text,
  "quantidade_total" integer,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "meia_entrada" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_ingressos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_ingressos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pedido_id" uuid,
  "sessao_id" uuid NOT NULL,
  "ingresso_tipo_id" uuid,
  "lote_id" uuid,
  "setor_id" uuid,
  "assento_id" uuid,
  "codigo_ingresso" text,
  "nome_portador" text,
  "documento_portador" text,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "status" USER-DEFINED NOT NULL DEFAULT 'DISPONIVEL'::evento_ingresso_status_enum,
  "reservado_em" timestamp with time zone,
  "vendido_em" timestamp with time zone,
  "cancelado_em" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessao_setores"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessao_setores" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessao_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "tipo_setor" USER-DEFINED NOT NULL DEFAULT 'PLATEIA'::evento_setor_tipo_enum,
  "capacidade" integer,
  "ordem" integer,
  "usa_assento_marcado" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_sessoes"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_sessoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "dia_id" uuid NOT NULL,
  "local_id" uuid,
  "titulo" text NOT NULL,
  "subtitulo" text,
  "tipo_sessao" USER-DEFINED NOT NULL DEFAULT 'OUTRO'::evento_sessao_tipo_enum,
  "hora_inicio" time without time zone,
  "hora_fim" time without time zone,
  "ordem" integer,
  "status" USER-DEFINED NOT NULL DEFAULT 'PLANEJADA'::evento_sessao_status_enum,
  "capacidade_total" integer,
  "exige_ingresso" boolean NOT NULL DEFAULT false,
  "usa_mapa_lugares" boolean NOT NULL DEFAULT false,
  "permite_publico_externo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_subeventos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_subeventos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "sessao_id" uuid,
  "titulo" text NOT NULL,
  "descricao" text,
  "usa_inscricao_propria" boolean NOT NULL DEFAULT false,
  "usa_financeiro_proprio" boolean NOT NULL DEFAULT false,
  "usa_elenco_proprio" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_escola_turmas_vinculos"
-- --------------------------------------------------
CREATE TABLE public."eventos_escola_turmas_vinculos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "edicao_id" uuid NOT NULL,
  "sessao_id" uuid,
  "turma_id" bigint NOT NULL,
  "tipo_vinculo" USER-DEFINED NOT NULL,
  "coreografia_id" uuid,
  "descricao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."eventos_internos"
-- --------------------------------------------------
CREATE TABLE public."eventos_internos" (
  "id" bigint NOT NULL,
  "periodo_letivo_id" bigint,
  "dominio" text NOT NULL,
  "categoria" text NOT NULL,
  "subcategoria" text,
  "titulo" text NOT NULL,
  "descricao" text,
  "inicio" timestamp with time zone NOT NULL,
  "fim" timestamp with time zone,
  "local" text,
  "formato" text NOT NULL DEFAULT 'PRESENCIAL'::text,
  "status" text NOT NULL DEFAULT 'AGENDADO'::text,
  "origem_tipo" text NOT NULL DEFAULT 'MANUAL'::text,
  "visibilidade" text NOT NULL DEFAULT 'ADMIN'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "em_avaliacao" boolean NOT NULL DEFAULT false,
  "data_prevista" date
);

-- --------------------------------------------------
-- Tabela: public."financeiro_aluno_planos_preco"
-- --------------------------------------------------
CREATE TABLE public."financeiro_aluno_planos_preco" (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_aluno_planos_preco_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "politica_id" bigint NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "manual" boolean NOT NULL DEFAULT false,
  "motivo" text,
  "justificativa" text,
  "definida_por" uuid,
  "definida_em" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."financeiro_analises_gpt"
-- --------------------------------------------------
CREATE TABLE public."financeiro_analises_gpt" (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_analises_gpt_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now(),
  "snapshot_id" bigint,
  "model" text,
  "alertas" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "texto_curto" text,
  "raw" jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- --------------------------------------------------
-- Tabela: public."financeiro_cobrancas_avulsas"
-- --------------------------------------------------
CREATE TABLE public."financeiro_cobrancas_avulsas" (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_cobrancas_avulsas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "origem_tipo" text NOT NULL,
  "origem_id" bigint NOT NULL,
  "valor_centavos" bigint NOT NULL,
  "vencimento" date NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "meio" text NOT NULL DEFAULT 'BOLETO'::text,
  "motivo_excecao" text NOT NULL,
  "observacao" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "pago_em" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."financeiro_cobrancas_avulsas_auditoria"
-- --------------------------------------------------
CREATE TABLE public."financeiro_cobrancas_avulsas_auditoria" (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_cobrancas_avulsas_auditoria_id_seq'::regclass),
  "cobranca_avulsa_id" bigint NOT NULL,
  "campo" text NOT NULL,
  "valor_anterior" text,
  "valor_novo" text,
  "motivo" text NOT NULL,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" text
);

-- --------------------------------------------------
-- Tabela: public."financeiro_config"
-- --------------------------------------------------
CREATE TABLE public."financeiro_config" (
  "id" smallint NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "dia_fechamento_faturas" smallint NOT NULL DEFAULT 1
);

-- --------------------------------------------------
-- Tabela: public."financeiro_politicas_preco"
-- --------------------------------------------------
CREATE TABLE public."financeiro_politicas_preco" (
  "politica_preco_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."financeiro_politicas_preco_padroes"
-- --------------------------------------------------
CREATE TABLE public."financeiro_politicas_preco_padroes" (
  "id" bigint NOT NULL,
  "tabela_id" bigint NOT NULL,
  "tabela_item_id" bigint NOT NULL,
  "politica_preco_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."financeiro_recorrencias"
-- --------------------------------------------------
CREATE TABLE public."financeiro_recorrencias" (
  "id" bigint NOT NULL DEFAULT nextval('financeiro_recorrencias_id_seq'::regclass),
  "tipo" text NOT NULL,
  "colaborador_id" bigint NOT NULL,
  "centro_custo_id" integer,
  "dia_pagamento" integer NOT NULL DEFAULT 5,
  "pagamento_no_mes_seguinte" boolean NOT NULL DEFAULT true,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."financeiro_snapshots"
-- --------------------------------------------------
CREATE TABLE public."financeiro_snapshots" (
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

-- --------------------------------------------------
-- Tabela: public."financeiro_tier_grupos"
-- --------------------------------------------------
CREATE TABLE public."financeiro_tier_grupos" (
  "tier_grupo_id" bigint NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."financeiro_tiers"
-- --------------------------------------------------
CREATE TABLE public."financeiro_tiers" (
  "tier_id" bigint NOT NULL,
  "tier_grupo_id" bigint NOT NULL,
  "ordem" integer NOT NULL,
  "valor_centavos" integer NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "tabela_id" bigint,
  "tabela_item_id" bigint,
  "ajuste_tipo" text,
  "ajuste_valor_centavos" integer,
  "politica_preco_id" bigint,
  "politica_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."folha_contas_pagar_referencias"
-- --------------------------------------------------
CREATE TABLE public."folha_contas_pagar_referencias" (
  "id" bigint NOT NULL DEFAULT nextval('folha_contas_pagar_referencias_id_seq'::regclass),
  "competencia" text NOT NULL,
  "folha_id" bigint NOT NULL,
  "colaborador_id" bigint NOT NULL,
  "conta_pagar_id" bigint NOT NULL,
  "centro_custo_id" integer NOT NULL,
  "valor_centavos" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."folha_pagamento"
-- --------------------------------------------------
CREATE TABLE public."folha_pagamento" (
  "id" bigint NOT NULL DEFAULT nextval('folha_pagamento_id_seq'::regclass),
  "competencia" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ABERTA'::text,
  "data_fechamento" date,
  "data_pagamento_prevista" date,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."folha_pagamento_colaborador"
-- --------------------------------------------------
CREATE TABLE public."folha_pagamento_colaborador" (
  "id" bigint NOT NULL DEFAULT nextval('folha_pagamento_colaborador_id_seq'::regclass),
  "competencia_ano_mes" text NOT NULL,
  "colaborador_id" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'ABERTA'::text,
  "data_fechamento" timestamp with time zone,
  "data_pagamento" timestamp with time zone,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."folha_pagamento_eventos"
-- --------------------------------------------------
CREATE TABLE public."folha_pagamento_eventos" (
  "id" bigint NOT NULL DEFAULT nextval('folha_pagamento_eventos_id_seq'::regclass),
  "folha_pagamento_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "descricao" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "origem_tipo" text,
  "origem_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."folha_pagamento_itens"
-- --------------------------------------------------
CREATE TABLE public."folha_pagamento_itens" (
  "id" bigint NOT NULL DEFAULT nextval('folha_pagamento_itens_id_seq'::regclass),
  "folha_id" bigint NOT NULL,
  "colaborador_id" bigint NOT NULL,
  "tipo_item" text NOT NULL,
  "descricao" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "referencia_tipo" text,
  "referencia_id" bigint,
  "criado_automatico" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_question_options"
-- --------------------------------------------------
CREATE TABLE public."form_question_options" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "question_id" uuid NOT NULL,
  "valor" text NOT NULL,
  "rotulo" text NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_questions"
-- --------------------------------------------------
CREATE TABLE public."form_questions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "codigo" text NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "tipo" USER-DEFINED NOT NULL,
  "ajuda" text,
  "placeholder" text,
  "min_num" numeric,
  "max_num" numeric,
  "min_len" integer,
  "max_len" integer,
  "scale_min" integer,
  "scale_max" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_response_answers"
-- --------------------------------------------------
CREATE TABLE public."form_response_answers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "response_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "valor_texto" text,
  "valor_numero" numeric,
  "valor_boolean" boolean,
  "valor_data" date,
  "valor_opcao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_response_selected_options"
-- --------------------------------------------------
CREATE TABLE public."form_response_selected_options" (
  "response_answer_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_responses"
-- --------------------------------------------------
CREATE TABLE public."form_responses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'COMPLETO'::text,
  "started_at" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_submission_answers"
-- --------------------------------------------------
CREATE TABLE public."form_submission_answers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" uuid NOT NULL,
  "template_item_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "value_text" text,
  "value_number" numeric,
  "value_bool" boolean,
  "value_date" date,
  "value_json" jsonb,
  "question_titulo_snapshot" text NOT NULL,
  "option_rotulos_snapshot" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_submissions"
-- --------------------------------------------------
CREATE TABLE public."form_submissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "template_versao" integer NOT NULL DEFAULT 1,
  "pessoa_id" bigint,
  "responsavel_id" bigint,
  "public_token" text NOT NULL,
  "status" text NOT NULL DEFAULT 'submitted'::text,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "review_status" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  "review_note" text
);

-- --------------------------------------------------
-- Tabela: public."form_template_blocos"
-- --------------------------------------------------
CREATE TABLE public."form_template_blocos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "tipo" text NOT NULL,
  "question_id" uuid,
  "titulo" text,
  "texto_md" text,
  "imagem_url" text,
  "alinhamento" text,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_template_items"
-- --------------------------------------------------
CREATE TABLE public."form_template_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "obrigatoria" boolean NOT NULL DEFAULT false,
  "cond_question_id" uuid,
  "cond_equals_value" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_template_questions"
-- --------------------------------------------------
CREATE TABLE public."form_template_questions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."form_templates"
-- --------------------------------------------------
CREATE TABLE public."form_templates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "descricao" text,
  "status" USER-DEFINED NOT NULL DEFAULT 'draft'::form_template_status,
  "versao" integer NOT NULL DEFAULT 1,
  "published_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "header_image_url" text,
  "footer_image_url" text,
  "intro_text_md" text,
  "outro_text_md" text
);

-- --------------------------------------------------
-- Tabela: public."formas_pagamento"
-- --------------------------------------------------
CREATE TABLE public."formas_pagamento" (
  "id" bigint NOT NULL DEFAULT nextval('formas_pagamento_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo_base" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."formas_pagamento_contexto"
-- --------------------------------------------------
CREATE TABLE public."formas_pagamento_contexto" (
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

-- --------------------------------------------------
-- Tabela: public."funcoes_colaborador"
-- --------------------------------------------------
CREATE TABLE public."funcoes_colaborador" (
  "id" integer NOT NULL DEFAULT nextval('funcoes_colaborador_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "grupo" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "grupo_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."funcoes_grupo"
-- --------------------------------------------------
CREATE TABLE public."funcoes_grupo" (
  "id" bigint NOT NULL DEFAULT nextval('funcoes_grupo_id_seq'::regclass),
  "nome" text NOT NULL,
  "pode_lecionar" boolean NOT NULL DEFAULT false,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer,
  "centro_custo_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."habilidades"
-- --------------------------------------------------
CREATE TABLE public."habilidades" (
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

-- --------------------------------------------------
-- Tabela: public."historico_academico"
-- --------------------------------------------------
CREATE TABLE public."historico_academico" (
  "id" bigint NOT NULL DEFAULT nextval('historico_academico_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "turma_id" bigint,
  "titulo" text NOT NULL,
  "nivel" text,
  "ano_referencia" integer,
  "data_inicio" date,
  "data_fim" date,
  "status" text NOT NULL DEFAULT 'EM_ANDAMENTO'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."locais"
-- --------------------------------------------------
CREATE TABLE public."locais" (
  "id" bigint NOT NULL DEFAULT nextval('locais_id_seq'::regclass),
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'INTERNO'::text,
  "endereco" text,
  "observacoes" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_cores"
-- --------------------------------------------------
CREATE TABLE public."loja_cores" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "codigo" text,
  "hex" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_estoque_movimentos"
-- --------------------------------------------------
CREATE TABLE public."loja_estoque_movimentos" (
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

-- --------------------------------------------------
-- Tabela: public."loja_fornecedor_precos"
-- --------------------------------------------------
CREATE TABLE public."loja_fornecedor_precos" (
  "id" bigint NOT NULL DEFAULT nextval('loja_fornecedor_precos_id_seq'::regclass),
  "fornecedor_id" bigint NOT NULL,
  "produto_id" bigint NOT NULL,
  "preco_custo_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "data_referencia" date NOT NULL DEFAULT CURRENT_DATE,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_fornecedores"
-- --------------------------------------------------
CREATE TABLE public."loja_fornecedores" (
  "id" bigint NOT NULL DEFAULT nextval('loja_fornecedores_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "codigo_interno" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_listas_demanda"
-- --------------------------------------------------
CREATE TABLE public."loja_listas_demanda" (
  "id" bigint NOT NULL DEFAULT nextval('loja_listas_demanda_id_seq'::regclass),
  "titulo" text NOT NULL,
  "contexto" text,
  "status" USER-DEFINED NOT NULL DEFAULT 'ATIVA'::loja_lista_demanda_status,
  "bloqueada" boolean NOT NULL DEFAULT false,
  "observacoes" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "bloqueada_em" timestamp with time zone,
  "bloqueada_por" uuid,
  "encerrada_em" timestamp with time zone,
  "encerrada_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."loja_listas_demanda_itens"
-- --------------------------------------------------
CREATE TABLE public."loja_listas_demanda_itens" (
  "id" bigint NOT NULL DEFAULT nextval('loja_listas_demanda_itens_id_seq'::regclass),
  "lista_id" bigint NOT NULL,
  "produto_id" bigint,
  "produto_variacao_id" bigint,
  "descricao_livre" text,
  "quantidade" integer NOT NULL,
  "observacoes" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_por" uuid,
  "pessoa_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."loja_marcas"
-- --------------------------------------------------
CREATE TABLE public."loja_marcas" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_modelos"
-- --------------------------------------------------
CREATE TABLE public."loja_modelos" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_numeracoes"
-- --------------------------------------------------
CREATE TABLE public."loja_numeracoes" (
  "id" bigint NOT NULL,
  "valor" integer NOT NULL,
  "tipo" text NOT NULL DEFAULT 'CALCADO'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_pedidos_compra"
-- --------------------------------------------------
CREATE TABLE public."loja_pedidos_compra" (
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

-- --------------------------------------------------
-- Tabela: public."loja_pedidos_compra_itens"
-- --------------------------------------------------
CREATE TABLE public."loja_pedidos_compra_itens" (
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

-- --------------------------------------------------
-- Tabela: public."loja_pedidos_compra_recebimentos"
-- --------------------------------------------------
CREATE TABLE public."loja_pedidos_compra_recebimentos" (
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

-- --------------------------------------------------
-- Tabela: public."loja_produto_categoria"
-- --------------------------------------------------
CREATE TABLE public."loja_produto_categoria" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "codigo" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_produto_categoria_subcategoria"
-- --------------------------------------------------
CREATE TABLE public."loja_produto_categoria_subcategoria" (
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

-- --------------------------------------------------
-- Tabela: public."loja_produto_variantes"
-- --------------------------------------------------
CREATE TABLE public."loja_produto_variantes" (
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

-- --------------------------------------------------
-- Tabela: public."loja_produtos"
-- --------------------------------------------------
CREATE TABLE public."loja_produtos" (
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

-- --------------------------------------------------
-- Tabela: public."loja_tamanhos"
-- --------------------------------------------------
CREATE TABLE public."loja_tamanhos" (
  "id" bigint NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'ROUPA'::text,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."loja_venda_itens"
-- --------------------------------------------------
CREATE TABLE public."loja_venda_itens" (
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

-- --------------------------------------------------
-- Tabela: public."loja_vendas"
-- --------------------------------------------------
CREATE TABLE public."loja_vendas" (
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

-- --------------------------------------------------
-- Tabela: public."mapa_habilidades"
-- --------------------------------------------------
CREATE TABLE public."mapa_habilidades" (
  "id" bigint NOT NULL,
  "mapa_modulo_id" bigint NOT NULL,
  "habilidade_id" bigint NOT NULL,
  "obrigatoria" boolean NOT NULL DEFAULT true,
  "peso_pedagogico" numeric,
  "ordem" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."mapa_modulos"
-- --------------------------------------------------
CREATE TABLE public."mapa_modulos" (
  "id" bigint NOT NULL,
  "mapa_id" bigint NOT NULL,
  "modulo_id" bigint NOT NULL,
  "obrigatorio" boolean NOT NULL DEFAULT true,
  "ordem" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."mapas_pedagogicos"
-- --------------------------------------------------
CREATE TABLE public."mapas_pedagogicos" (
  "id" bigint NOT NULL,
  "curso_id" bigint NOT NULL,
  "nivel_id" bigint NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."matricula_configuracoes"
-- --------------------------------------------------
CREATE TABLE public."matricula_configuracoes" (
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
  "multa_percentual_padrao" numeric NOT NULL DEFAULT 2.00,
  "juros_mora_percentual_mensal_padrao" numeric NOT NULL DEFAULT 1.00
);

-- --------------------------------------------------
-- Tabela: public."matricula_eventos"
-- --------------------------------------------------
CREATE TABLE public."matricula_eventos" (
  "id" bigint NOT NULL,
  "matricula_id" bigint NOT NULL,
  "tipo_evento" text NOT NULL,
  "dados" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "autorizado_por" uuid,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_execucao_valores"
-- --------------------------------------------------
CREATE TABLE public."matricula_execucao_valores" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_execucao_valores_id_seq'::regclass),
  "matricula_id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "nivel" text NOT NULL,
  "valor_mensal_centavos" integer NOT NULL,
  "origem_valor" text NOT NULL DEFAULT 'MANUAL'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_grupos_financeiros"
-- --------------------------------------------------
CREATE TABLE public."matricula_grupos_financeiros" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_grupos_financeiros_id_seq'::regclass),
  "aluno_id" bigint NOT NULL,
  "responsavel_financeiro_id" bigint,
  "ano_referencia" integer NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_planos"
-- --------------------------------------------------
CREATE TABLE public."matricula_planos" (
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

-- --------------------------------------------------
-- Tabela: public."matricula_planos_pagamento"
-- --------------------------------------------------
CREATE TABLE public."matricula_planos_pagamento" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_planos_pagamento_id_seq'::regclass),
  "titulo" text NOT NULL,
  "numero_parcelas" integer,
  "permite_prorata" boolean NOT NULL DEFAULT false,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "descricao" text,
  "nome" text,
  "ciclo_cobranca" text,
  "termino_cobranca" text,
  "data_fim_manual" date,
  "regra_total_devido" text,
  "permite_prorrata" boolean DEFAULT false,
  "ciclo_financeiro" text,
  "forma_liquidacao_padrao" text,
  "observacoes" text,
  "politica_primeira_cobranca" text NOT NULL DEFAULT 'NO_ATO'::text
);

-- --------------------------------------------------
-- Tabela: public."matricula_precos_servico"
-- --------------------------------------------------
CREATE TABLE public."matricula_precos_servico" (
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

-- --------------------------------------------------
-- Tabela: public."matricula_precos_turma"
-- --------------------------------------------------
CREATE TABLE public."matricula_precos_turma" (
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

-- --------------------------------------------------
-- Tabela: public."matricula_tabela_itens"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabela_itens" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_tabela_itens_id_seq'::regclass),
  "tabela_id" bigint NOT NULL,
  "codigo_item" text NOT NULL,
  "descricao" text,
  "tipo_item" text NOT NULL,
  "valor_centavos" integer NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_tabelas"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabelas" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_tabelas_id_seq'::regclass),
  "produto_tipo" text NOT NULL,
  "referencia_tipo" text NOT NULL,
  "referencia_id" bigint,
  "ano_referencia" integer,
  "titulo" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_tabelas_alvos"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabelas_alvos" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_tabelas_alvos_id_seq'::regclass),
  "tabela_id" bigint NOT NULL,
  "alvo_tipo" text NOT NULL,
  "alvo_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_tabelas_precificacao_tiers"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabelas_precificacao_tiers" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_tabelas_precificacao_tiers_id_seq'::regclass),
  "tabela_id" bigint NOT NULL,
  "minimo_modalidades" integer NOT NULL,
  "maximo_modalidades" integer,
  "item_codigo" text NOT NULL,
  "tipo_item" text NOT NULL DEFAULT 'RECORRENTE'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_tabelas_turmas"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabelas_turmas" (
  "id" bigint NOT NULL DEFAULT nextval('matricula_tabelas_turmas_id_seq'::regclass),
  "tabela_id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matricula_tabelas_unidades_execucao"
-- --------------------------------------------------
CREATE TABLE public."matricula_tabelas_unidades_execucao" (
  "id" bigint NOT NULL,
  "tabela_id" bigint NOT NULL,
  "unidade_execucao_id" bigint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matriculas"
-- --------------------------------------------------
CREATE TABLE public."matriculas" (
  "id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "responsavel_financeiro_id" bigint NOT NULL,
  "tipo_matricula" USER-DEFINED NOT NULL,
  "vinculo_id" bigint NOT NULL,
  "plano_matricula_id" bigint,
  "documento_modelo_id" bigint,
  "documento_emitido_id" bigint,
  "documento_pdf_url" text,
  "status" USER-DEFINED NOT NULL,
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
  "plano_id" bigint,
  "data_inicio_vinculo" date,
  "tabela_matricula_id" bigint,
  "plano_pagamento_id" bigint,
  "vencimento_dia_padrao" integer DEFAULT 12,
  "vencimento_padrao_referencia" integer,
  "escola_tabela_preco_curso_id" bigint,
  "forma_liquidacao_padrao" text,
  "grupo_financeiro_id" bigint,
  "produto_id" bigint,
  "primeira_cobranca_tipo" text,
  "primeira_cobranca_status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "primeira_cobranca_valor_centavos" integer,
  "primeira_cobranca_cobranca_id" bigint,
  "primeira_cobranca_recebimento_id" bigint,
  "primeira_cobranca_forma_pagamento_id" bigint,
  "primeira_cobranca_data_pagamento" date,
  "excecao_primeiro_pagamento" boolean NOT NULL DEFAULT false,
  "motivo_excecao_primeiro_pagamento" text,
  "excecao_autorizada_por" uuid,
  "excecao_criada_em" timestamp with time zone,
  "documento_conjunto_id" bigint,
  "total_mensalidade_centavos" integer NOT NULL DEFAULT 0,
  "rascunho_expira_em" timestamp with time zone,
  "origem_valor" text,
  "movimento_concessao_id" uuid,
  "encerramento_tipo" text,
  "encerramento_motivo" text,
  "encerramento_em" timestamp with time zone,
  "encerramento_por_user_id" uuid,
  "cancelamento_tipo" text,
  "gera_perda_financeira" boolean DEFAULT false
);

-- --------------------------------------------------
-- Tabela: public."matriculas_compromissos_previstos"
-- --------------------------------------------------
CREATE TABLE public."matriculas_compromissos_previstos" (
  "id" bigint NOT NULL DEFAULT nextval('matriculas_compromissos_previstos_id_seq'::regclass),
  "contexto_matricula_id" bigint NOT NULL,
  "aluno_pessoa_id" bigint NOT NULL,
  "total_anual_previsto_centavos" integer NOT NULL,
  "total_mensal_previsto_centavos" integer NOT NULL,
  "snapshot_json" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matriculas_encerramentos"
-- --------------------------------------------------
CREATE TABLE public."matriculas_encerramentos" (
  "id" bigint NOT NULL DEFAULT nextval('matriculas_encerramentos_id_seq'::regclass),
  "matricula_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "motivo" text NOT NULL,
  "realizado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "realizado_por_user_id" uuid,
  "cobrancas_canceladas_qtd" integer NOT NULL DEFAULT 0,
  "cobrancas_canceladas_valor_centavos" integer NOT NULL DEFAULT 0,
  "payload" jsonb
);

-- --------------------------------------------------
-- Tabela: public."matriculas_financeiro_linhas"
-- --------------------------------------------------
CREATE TABLE public."matriculas_financeiro_linhas" (
  "id" bigint NOT NULL DEFAULT nextval('matriculas_financeiro_linhas_id_seq'::regclass),
  "matricula_id" bigint NOT NULL,
  "tipo" text NOT NULL,
  "descricao" text NOT NULL DEFAULT ''::text,
  "valor_centavos" integer NOT NULL DEFAULT 0,
  "vencimento" date,
  "data_evento" date,
  "status" text NOT NULL DEFAULT 'PENDENTE'::text,
  "origem_tabela" text,
  "origem_id" bigint,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."matriculas_itens"
-- --------------------------------------------------
CREATE TABLE public."matriculas_itens" (
  "id" bigint NOT NULL,
  "matricula_id" bigint NOT NULL,
  "item_id" bigint NOT NULL,
  "quantidade" integer NOT NULL DEFAULT 1,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."modelos_pagamento_colaborador"
-- --------------------------------------------------
CREATE TABLE public."modelos_pagamento_colaborador" (
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

-- --------------------------------------------------
-- Tabela: public."modulos"
-- --------------------------------------------------
CREATE TABLE public."modulos" (
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

-- --------------------------------------------------
-- Tabela: public."movimento_acao_participantes"
-- --------------------------------------------------
CREATE TABLE public."movimento_acao_participantes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "acao_id" uuid NOT NULL,
  "pessoa_id" uuid NOT NULL,
  "papel" text,
  "observacoes" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_acoes"
-- --------------------------------------------------
CREATE TABLE public."movimento_acoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tipo" USER-DEFINED NOT NULL DEFAULT 'OUTRA'::movimento_acao_tipo,
  "titulo" text NOT NULL,
  "descricao" text,
  "data_inicio" date,
  "data_fim" date,
  "metricas_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "atualizado_em" timestamp with time zone,
  "atualizado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_analises_socioeconomicas"
-- --------------------------------------------------
CREATE TABLE public."movimento_analises_socioeconomicas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pessoa_id" bigint NOT NULL,
  "responsavel_legal_pessoa_id" bigint,
  "data_analise" date NOT NULL DEFAULT CURRENT_DATE,
  "contexto" text NOT NULL,
  "registrado_por_user_id" uuid,
  "status" text NOT NULL DEFAULT 'RASCUNHO'::text,
  "respostas_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "resultado_status" text,
  "observacao_institucional" text,
  "data_sugerida_revisao" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_beneficiario_coberturas"
-- --------------------------------------------------
CREATE TABLE public."movimento_beneficiario_coberturas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "beneficiario_id" uuid NOT NULL,
  "servico_id" uuid,
  "turma_id" uuid,
  "ativo" boolean NOT NULL DEFAULT true,
  "dt_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "dt_fim" date,
  "observacoes" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_beneficiarios"
-- --------------------------------------------------
CREATE TABLE public."movimento_beneficiarios" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "status" USER-DEFINED NOT NULL DEFAULT 'EM_ANALISE'::movimento_beneficiario_status,
  "relatorio_socioeconomico" text NOT NULL,
  "dados_complementares" jsonb,
  "termo_consentimento_assinado" boolean NOT NULL DEFAULT false,
  "termo_participacao_assinado" boolean NOT NULL DEFAULT false,
  "contrato_assinado" boolean NOT NULL DEFAULT false,
  "documentos_refs" jsonb,
  "observacoes" text,
  "aprovado_em" timestamp with time zone,
  "aprovado_por" uuid,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "responsavel_id" uuid,
  "eh_menor" boolean NOT NULL DEFAULT false,
  "acionar_form_responsavel" boolean NOT NULL DEFAULT false,
  "acionar_form_aluno_menor" boolean NOT NULL DEFAULT false,
  "acionar_form_aluno_maior" boolean NOT NULL DEFAULT false,
  "atualizado_em" timestamp with time zone,
  "atualizado_por" uuid,
  "analise_id" uuid,
  "ase_submission_id" uuid,
  "ase_submitted_at" timestamp with time zone,
  "exercicio_ano" integer,
  "valido_ate" date,
  "pessoa_id" bigint NOT NULL
);

-- --------------------------------------------------
-- Tabela: public."movimento_concessoes"
-- --------------------------------------------------
CREATE TABLE public."movimento_concessoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "beneficiario_id" uuid NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'ATIVA'::movimento_concessao_status,
  "data_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "data_fim" date,
  "revisao_prevista_em" date,
  "modelo_liquidacao" USER-DEFINED NOT NULL DEFAULT 'MOVIMENTO'::movimento_liquidacao_modelo,
  "percentual_movimento" integer NOT NULL DEFAULT 100,
  "percentual_familia" integer NOT NULL DEFAULT 0,
  "justificativa" text,
  "autorizada_por" uuid,
  "autorizada_em" timestamp with time zone,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "atualizado_em" timestamp with time zone,
  "atualizado_por" uuid,
  "dia_vencimento_ciclo" integer NOT NULL DEFAULT 1
);

-- --------------------------------------------------
-- Tabela: public."movimento_concessoes_ciclos"
-- --------------------------------------------------
CREATE TABLE public."movimento_concessoes_ciclos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "concessao_id" uuid NOT NULL,
  "competencia" date NOT NULL,
  "dt_vencimento" date NOT NULL,
  "dt_renovacao" timestamp with time zone NOT NULL DEFAULT now(),
  "observacoes" text,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_creditos"
-- --------------------------------------------------
CREATE TABLE public."movimento_creditos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "aluno_id" uuid,
  "tipo" USER-DEFINED NOT NULL,
  "origem" USER-DEFINED NOT NULL,
  "proposito" text NOT NULL,
  "curso_id" uuid,
  "projeto_id" uuid,
  "competencia_inicio" text NOT NULL,
  "competencia_fim" text NOT NULL,
  "quantidade_total" integer NOT NULL,
  "quantidade_consumida" integer NOT NULL DEFAULT 0,
  "status" USER-DEFINED NOT NULL DEFAULT 'ATIVO'::movimento_credito_status,
  "observacoes" text,
  "criado_em" timestamp with time zone DEFAULT now(),
  "criado_por" uuid,
  "lote_id" uuid,
  "beneficiario_id" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_creditos_compromissos"
-- --------------------------------------------------
CREATE TABLE public."movimento_creditos_compromissos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "credito_id" uuid NOT NULL,
  "aluno_id" uuid NOT NULL,
  "competencia" text NOT NULL,
  "operacao_tipo" text NOT NULL,
  "operacao_id" uuid NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'ATIVO'::movimento_compromisso_status,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_creditos_consumo"
-- --------------------------------------------------
CREATE TABLE public."movimento_creditos_consumo" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "credito_id" uuid NOT NULL,
  "aluno_id" uuid NOT NULL,
  "competencia" text NOT NULL,
  "operacao_tipo" text NOT NULL,
  "operacao_id" uuid NOT NULL,
  "consumido_em" timestamp with time zone DEFAULT now(),
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_creditos_lotes"
-- --------------------------------------------------
CREATE TABLE public."movimento_creditos_lotes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "competencia" text NOT NULL,
  "origem" USER-DEFINED NOT NULL,
  "regra_id" uuid,
  "regra_alocacao_id" uuid,
  "fonte_externa_id" uuid,
  "tipo_credito" USER-DEFINED NOT NULL,
  "valor_base" numeric,
  "quantidade_total" integer NOT NULL,
  "quantidade_alocada" integer NOT NULL DEFAULT 0,
  "proposito" text,
  "curso_id_destino" uuid,
  "projeto_id_destino" uuid,
  "filtros" jsonb,
  "status" USER-DEFINED NOT NULL DEFAULT 'ABERTO'::movimento_lote_status,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_execucoes_mensais"
-- --------------------------------------------------
CREATE TABLE public."movimento_execucoes_mensais" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "competencia" text NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'PENDENTE'::movimento_execucao_status,
  "log_execucao" text,
  "executado_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_financeiro"
-- --------------------------------------------------
CREATE TABLE public."movimento_financeiro" (
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

-- --------------------------------------------------
-- Tabela: public."movimento_fontes_externas"
-- --------------------------------------------------
CREATE TABLE public."movimento_fontes_externas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "observacoes" text,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_fontes_externas_cronograma"
-- --------------------------------------------------
CREATE TABLE public."movimento_fontes_externas_cronograma" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "fonte_id" uuid NOT NULL,
  "competencia" text NOT NULL,
  "quantidade_creditos" integer NOT NULL,
  "confirmado" boolean NOT NULL DEFAULT false,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."movimento_formularios_instancia"
-- --------------------------------------------------
CREATE TABLE public."movimento_formularios_instancia" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "beneficiario_id" uuid NOT NULL,
  "modelo_id" uuid NOT NULL,
  "tipo" USER-DEFINED NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'PENDENTE'::movimento_formulario_status,
  "respondente_pessoa_id" uuid,
  "iniciado_em" timestamp with time zone,
  "concluido_em" timestamp with time zone,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "atualizado_em" timestamp with time zone,
  "atualizado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_formularios_modelo"
-- --------------------------------------------------
CREATE TABLE public."movimento_formularios_modelo" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tipo" USER-DEFINED NOT NULL,
  "titulo" text NOT NULL,
  "versao" text NOT NULL DEFAULT 'v1'::text,
  "ativo" boolean NOT NULL DEFAULT true,
  "schema_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "criado_por" uuid,
  "atualizado_em" timestamp with time zone,
  "atualizado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_formularios_respostas"
-- --------------------------------------------------
CREATE TABLE public."movimento_formularios_respostas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "instancia_id" uuid NOT NULL,
  "respostas_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "enviado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "enviado_por" uuid
);

-- --------------------------------------------------
-- Tabela: public."movimento_regras_geracao"
-- --------------------------------------------------
CREATE TABLE public."movimento_regras_geracao" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "descricao" text NOT NULL,
  "base_calculo" USER-DEFINED NOT NULL DEFAULT 'VALOR_RECEBIDO_CONFIRMADO'::movimento_regra_geracao_base,
  "origem_recurso" text NOT NULL,
  "reais_por_credito" numeric NOT NULL,
  "tipo_credito_gerado" USER-DEFINED NOT NULL DEFAULT 'CR_REGULAR'::movimento_credito_tipo,
  "limite_mensal" integer,
  "reserva_percentual" integer,
  "vigencia_inicio" text NOT NULL,
  "vigencia_fim" text,
  "ativa" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now(),
  "centro_custo_id" uuid,
  "filtros" jsonb,
  "observacoes" text
);

-- --------------------------------------------------
-- Tabela: public."movimento_regras_geracao_alocacoes"
-- --------------------------------------------------
CREATE TABLE public."movimento_regras_geracao_alocacoes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "regra_id" uuid NOT NULL,
  "tipo_credito_gerado" USER-DEFINED NOT NULL,
  "percentual" integer NOT NULL,
  "reais_por_credito_override" numeric,
  "proposito_padrao" text,
  "curso_id_destino" uuid,
  "projeto_id_destino" uuid,
  "filtros" jsonb,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."nasc_observacoes"
-- --------------------------------------------------
CREATE TABLE public."nasc_observacoes" (
  "id" bigint NOT NULL DEFAULT nextval('nasc_observacoes_id_seq'::regclass),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "app_context" text,
  "pathname" text,
  "full_url" text,
  "page_title" text,
  "entity_ref" text,
  "observacao" text NOT NULL,
  "user_agent" text,
  "viewport_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "context_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'ABERTO'::text,
  "triagem_notas" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."niveis"
-- --------------------------------------------------
CREATE TABLE public."niveis" (
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

-- --------------------------------------------------
-- Tabela: public."nucleo_membros"
-- --------------------------------------------------
CREATE TABLE public."nucleo_membros" (
  "id" bigint NOT NULL DEFAULT nextval('nucleo_membros_id_seq'::regclass),
  "nucleo_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "data_entrada" date NOT NULL DEFAULT CURRENT_DATE,
  "data_saida" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."nucleos"
-- --------------------------------------------------
CREATE TABLE public."nucleos" (
  "id" bigint NOT NULL DEFAULT nextval('nucleos_id_seq'::regclass),
  "nome" text NOT NULL,
  "categoria" text,
  "subcategoria" text,
  "tipo" text NOT NULL DEFAULT 'DURADOURO'::text,
  "descricao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."periodos_letivos"
-- --------------------------------------------------
CREATE TABLE public."periodos_letivos" (
  "id" bigint NOT NULL,
  "codigo" text NOT NULL,
  "titulo" text NOT NULL,
  "ano_referencia" integer NOT NULL,
  "data_inicio" date NOT NULL,
  "data_fim" date NOT NULL,
  "inicio_letivo_janeiro" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."periodos_letivos_faixas"
-- --------------------------------------------------
CREATE TABLE public."periodos_letivos_faixas" (
  "id" bigint NOT NULL,
  "periodo_letivo_id" bigint NOT NULL,
  "dominio" text NOT NULL DEFAULT 'ACADEMICO'::text,
  "categoria" text NOT NULL,
  "subcategoria" text,
  "titulo" text NOT NULL,
  "descricao" text,
  "data_inicio" date NOT NULL,
  "data_fim" date NOT NULL,
  "sem_aula" boolean NOT NULL DEFAULT false,
  "em_avaliacao" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_cuidados"
-- --------------------------------------------------
CREATE TABLE public."pessoa_cuidados" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_cuidados_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "historico_lesoes" text,
  "restricoes_fisicas" text,
  "condicoes_neuro" text,
  "tipo_sanguineo" text,
  "alergias_alimentares" text,
  "alergias_medicamentos" text,
  "alergias_produtos" text,
  "pode_consumir_acucar" text,
  "pode_consumir_refrigerante" text,
  "restricoes_alimentares_observacoes" text,
  "tipo_autorizacao_saida" text,
  "contato_emergencia_pessoa_id" bigint,
  "contato_emergencia_relacao" text,
  "contato_emergencia_observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_cuidados_autorizados_busca"
-- --------------------------------------------------
CREATE TABLE public."pessoa_cuidados_autorizados_busca" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_cuidados_autorizados_busca_id_seq'::regclass),
  "pessoa_cuidados_id" bigint NOT NULL,
  "pessoa_autorizada_id" bigint NOT NULL,
  "parentesco" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_medidas_declaradas"
-- --------------------------------------------------
CREATE TABLE public."pessoa_medidas_declaradas" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_medidas_declaradas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "categoria" text NOT NULL,
  "tamanho" text NOT NULL,
  "data_referencia" date,
  "observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_observacoes"
-- --------------------------------------------------
CREATE TABLE public."pessoa_observacoes" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_observacoes_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "natureza" text NOT NULL,
  "titulo" text,
  "descricao" text NOT NULL,
  "data_referencia" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_observacoes_pedagogicas"
-- --------------------------------------------------
CREATE TABLE public."pessoa_observacoes_pedagogicas" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_observacoes_pedagogicas_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "observado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "professor_pessoa_id" bigint,
  "titulo" text,
  "descricao" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoa_responsavel_financeiro_vinculos"
-- --------------------------------------------------
CREATE TABLE public."pessoa_responsavel_financeiro_vinculos" (
  "id" bigint NOT NULL DEFAULT nextval('pessoa_responsavel_financeiro_vinculos_id_seq'::regclass),
  "responsavel_pessoa_id" bigint NOT NULL,
  "dependente_pessoa_id" bigint NOT NULL,
  "origem_tipo" text,
  "origem_id" bigint,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone NOT NULL DEFAULT now(),
  "atualizado_em" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."pessoas"
-- --------------------------------------------------
CREATE TABLE public."pessoas" (
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
  "genero" USER-DEFINED NOT NULL DEFAULT 'NAO_INFORMADO'::genero_pessoa,
  "estado_civil" USER-DEFINED,
  "nacionalidade" text,
  "naturalidade" text,
  "telefone_secundario" text,
  "cnpj" text,
  "razao_social" text,
  "nome_fantasia" text,
  "inscricao_estadual" text,
  "endereco_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."pessoas_roles"
-- --------------------------------------------------
CREATE TABLE public."pessoas_roles" (
  "id" bigint NOT NULL DEFAULT nextval('pessoas_roles_id_seq'::regclass),
  "pessoa_id" bigint NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."planejamento_ciclos"
-- --------------------------------------------------
CREATE TABLE public."planejamento_ciclos" (
  "id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "titulo" text NOT NULL,
  "aula_inicio_numero" integer NOT NULL,
  "aula_fim_numero" integer NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'RASCUNHO'::planejamento_ciclo_status,
  "aprovado_por" uuid,
  "aprovado_em" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."plano_aula_blocos"
-- --------------------------------------------------
CREATE TABLE public."plano_aula_blocos" (
  "id" bigint NOT NULL,
  "plano_aula_id" bigint NOT NULL,
  "ordem" integer NOT NULL,
  "titulo" text NOT NULL,
  "objetivo" text,
  "minutos_min" integer,
  "minutos_ideal" integer,
  "minutos_max" integer,
  "musica_sugestao" text,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."plano_aula_instancias"
-- --------------------------------------------------
CREATE TABLE public."plano_aula_instancias" (
  "id" bigint NOT NULL,
  "turma_aula_id" bigint NOT NULL,
  "plano_aula_id" bigint NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'EM_EXECUCAO'::plano_sessao_status,
  "notas_pos_aula" text,
  "concluido_por" uuid,
  "concluido_em" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."plano_aula_subblocos"
-- --------------------------------------------------
CREATE TABLE public."plano_aula_subblocos" (
  "id" bigint NOT NULL,
  "bloco_id" bigint NOT NULL,
  "ordem" integer NOT NULL,
  "titulo" text NOT NULL,
  "minutos_min" integer,
  "minutos_ideal" integer,
  "minutos_max" integer,
  "habilidade_id" bigint,
  "nivel_abordagem" USER-DEFINED,
  "instrucoes" text,
  "musica_sugestao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."plano_contas"
-- --------------------------------------------------
CREATE TABLE public."plano_contas" (
  "id" integer NOT NULL DEFAULT nextval('plano_contas_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "tipo" text NOT NULL,
  "parent_id" integer
);

-- --------------------------------------------------
-- Tabela: public."planos_aula"
-- --------------------------------------------------
CREATE TABLE public."planos_aula" (
  "id" bigint NOT NULL,
  "ciclo_id" bigint NOT NULL,
  "aula_numero" integer NOT NULL,
  "intencao_pedagogica" text,
  "observacoes_gerais" text,
  "playlist_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
);

-- --------------------------------------------------
-- Tabela: public."professores"
-- --------------------------------------------------
CREATE TABLE public."professores" (
  "id" bigint NOT NULL DEFAULT nextval('professores_id_seq'::regclass),
  "colaborador_id" bigint NOT NULL,
  "tipo_professor_id" integer,
  "bio" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "observacoes" text
);

-- --------------------------------------------------
-- Tabela: public."profiles"
-- --------------------------------------------------
CREATE TABLE public."profiles" (
  "user_id" uuid NOT NULL,
  "full_name" text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "pessoa_id" integer NOT NULL
);

-- --------------------------------------------------
-- Tabela: public."projetos_sociais"
-- --------------------------------------------------
CREATE TABLE public."projetos_sociais" (
  "id" bigint NOT NULL DEFAULT nextval('projetos_sociais_id_seq'::regclass),
  "escola_id" bigint,
  "nome" text NOT NULL,
  "descricao" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."projetos_sociais_beneficiarios"
-- --------------------------------------------------
CREATE TABLE public."projetos_sociais_beneficiarios" (
  "id" bigint NOT NULL DEFAULT nextval('projetos_sociais_beneficiarios_id_seq'::regclass),
  "projeto_social_id" bigint NOT NULL,
  "pessoa_id" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'ATIVO'::text,
  "data_inicio" date NOT NULL DEFAULT CURRENT_DATE,
  "data_fim" date,
  "origem_legado" text,
  "legado_payload" jsonb,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."recebimentos"
-- --------------------------------------------------
CREATE TABLE public."recebimentos" (
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

-- --------------------------------------------------
-- Tabela: public."roles_sistema"
-- --------------------------------------------------
CREATE TABLE public."roles_sistema" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "editavel" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "permissoes" jsonb,
  "ativo" boolean NOT NULL DEFAULT true
);

-- --------------------------------------------------
-- Tabela: public."ruas"
-- --------------------------------------------------
CREATE TABLE public."ruas" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "bairro_id" uuid,
  "nome" text NOT NULL,
  "cep" text,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."servico_itens"
-- --------------------------------------------------
CREATE TABLE public."servico_itens" (
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

-- --------------------------------------------------
-- Tabela: public."servico_itens_precos"
-- --------------------------------------------------
CREATE TABLE public."servico_itens_precos" (
  "id" bigint NOT NULL,
  "item_id" bigint NOT NULL,
  "valor_centavos" integer NOT NULL,
  "moeda" text NOT NULL DEFAULT 'BRL'::text,
  "vigencia_inicio" date,
  "vigencia_fim" date,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."servicos"
-- --------------------------------------------------
CREATE TABLE public."servicos" (
  "id" bigint NOT NULL,
  "tipo" USER-DEFINED NOT NULL,
  "referencia_tipo" text NOT NULL,
  "referencia_id" bigint NOT NULL,
  "titulo" text,
  "ano_referencia" integer,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."suporte_tickets"
-- --------------------------------------------------
CREATE TABLE public."suporte_tickets" (
  "id" bigint NOT NULL DEFAULT nextval('suporte_tickets_id_seq'::regclass),
  "codigo" text,
  "tipo" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ABERTO'::text,
  "prioridade" text NOT NULL DEFAULT 'MEDIA'::text,
  "titulo" text,
  "descricao" text NOT NULL,
  "contexto_slug" text,
  "contexto_nome" text,
  "rota_path" text,
  "url_completa" text,
  "pagina_titulo" text,
  "origem" text NOT NULL DEFAULT 'BOTAO_FLUTUANTE'::text,
  "screenshot_url" text,
  "dados_contexto_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "dados_tecnicos_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "erro_mensagem" text,
  "erro_stack" text,
  "erro_nome" text,
  "user_agent" text,
  "viewport_largura" integer,
  "viewport_altura" integer,
  "reported_by" uuid,
  "responsavel_uuid" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at" timestamp with time zone
);

-- --------------------------------------------------
-- Tabela: public."system_settings"
-- --------------------------------------------------
CREATE TABLE public."system_settings" (
  "id" bigint NOT NULL,
  "system_name" text NOT NULL DEFAULT 'Conectarte'::text,
  "logo_color_url" text,
  "logo_white_url" text,
  "logo_transparent_url" text,
  "wordmark_segments" jsonb NOT NULL DEFAULT '[{"text": "Conect", "color": "blue"}, {"text": "ar", "color": "red"}, {"text": "t", "color": "orange"}, {"text": "e", "color": "green"}]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."tipos_professor"
-- --------------------------------------------------
CREATE TABLE public."tipos_professor" (
  "id" integer NOT NULL DEFAULT nextval('tipos_professor_id_seq'::regclass),
  "codigo" text NOT NULL,
  "nome" text NOT NULL,
  "descricao" text
);

-- --------------------------------------------------
-- Tabela: public."tipos_vinculo_colaborador"
-- --------------------------------------------------
CREATE TABLE public."tipos_vinculo_colaborador" (
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

-- --------------------------------------------------
-- Tabela: public."turma_aluno"
-- --------------------------------------------------
CREATE TABLE public."turma_aluno" (
  "turma_aluno_id" bigint NOT NULL DEFAULT nextval('turma_aluno_turma_aluno_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "aluno_pessoa_id" bigint NOT NULL,
  "dt_inicio" date DEFAULT CURRENT_DATE,
  "dt_fim" date,
  "status" text DEFAULT 'ativo'::text,
  "matricula_id" bigint,
  "nivel_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."turma_aula_presencas"
-- --------------------------------------------------
CREATE TABLE public."turma_aula_presencas" (
  "id" bigint NOT NULL,
  "aula_id" bigint NOT NULL,
  "aluno_pessoa_id" bigint NOT NULL,
  "status" USER-DEFINED NOT NULL,
  "minutos_atraso" integer,
  "observacao" text,
  "registrado_por" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."turma_aulas"
-- --------------------------------------------------
CREATE TABLE public."turma_aulas" (
  "id" bigint NOT NULL,
  "turma_id" bigint NOT NULL,
  "data_aula" date NOT NULL,
  "hora_inicio" time without time zone,
  "hora_fim" time without time zone,
  "conteudo" text,
  "observacoes" text,
  "criado_por" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "fechada_em" timestamp with time zone,
  "fechada_por" uuid,
  "aula_numero" integer,
  "status_execucao" USER-DEFINED NOT NULL DEFAULT 'PENDENTE'::status_execucao_aula,
  "aberta_em" timestamp with time zone,
  "aberta_por" uuid,
  "frequencia_salva_em" timestamp with time zone,
  "frequencia_salva_por" uuid,
  "observacao_execucao" text
);

-- --------------------------------------------------
-- Tabela: public."turma_avaliacoes"
-- --------------------------------------------------
CREATE TABLE public."turma_avaliacoes" (
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

-- --------------------------------------------------
-- Tabela: public."turma_encontros"
-- --------------------------------------------------
CREATE TABLE public."turma_encontros" (
  "id" bigint NOT NULL DEFAULT nextval('turma_encontros_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "data" date NOT NULL,
  "hora_inicio" time without time zone,
  "hora_fim" time without time zone,
  "ordem" integer NOT NULL DEFAULT 0,
  "observacao" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."turma_niveis"
-- --------------------------------------------------
CREATE TABLE public."turma_niveis" (
  "id" bigint NOT NULL DEFAULT nextval('turma_niveis_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "nivel_id" bigint NOT NULL,
  "principal" boolean NOT NULL DEFAULT false
);

-- --------------------------------------------------
-- Tabela: public."turma_professores"
-- --------------------------------------------------
CREATE TABLE public."turma_professores" (
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

-- --------------------------------------------------
-- Tabela: public."turmas"
-- --------------------------------------------------
CREATE TABLE public."turmas" (
  "turma_id" bigint NOT NULL DEFAULT nextval('turmas_turma_id_seq'::regclass),
  "nome" text NOT NULL,
  "curso" text,
  "nivel" text,
  "capacidade" integer,
  "dias_semana" ARRAY,
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
  "espaco_id" bigint,
  "produto_id" bigint,
  "contexto_matricula_id" bigint,
  "curso_livre_id" bigint
);

-- --------------------------------------------------
-- Tabela: public."turmas_historico"
-- --------------------------------------------------
CREATE TABLE public."turmas_historico" (
  "id" bigint NOT NULL DEFAULT nextval('turmas_historico_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "ocorrida_em" timestamp with time zone NOT NULL DEFAULT now(),
  "actor_user_id" uuid,
  "evento" text NOT NULL,
  "resumo" text,
  "diff" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "snapshot" jsonb
);

-- --------------------------------------------------
-- Tabela: public."turmas_horarios"
-- --------------------------------------------------
CREATE TABLE public."turmas_horarios" (
  "id" bigint NOT NULL DEFAULT nextval('turmas_horarios_id_seq'::regclass),
  "turma_id" bigint NOT NULL,
  "day_of_week" smallint NOT NULL,
  "inicio" time without time zone NOT NULL,
  "fim" time without time zone NOT NULL
);

-- --------------------------------------------------
-- Tabela: public."usuario_contexto_preferencias"
-- --------------------------------------------------
CREATE TABLE public."usuario_contexto_preferencias" (
  "id" bigint NOT NULL DEFAULT nextval('usuario_contexto_preferencias_id_seq'::regclass),
  "user_id" uuid NOT NULL,
  "contexto" text NOT NULL,
  "rota_principal" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."usuario_roles"
-- --------------------------------------------------
CREATE TABLE public."usuario_roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- --------------------------------------------------
-- Tabela: public."vinculos"
-- --------------------------------------------------
CREATE TABLE public."vinculos" (
  "id" bigint NOT NULL DEFAULT nextval('vinculos_id_seq'::regclass),
  "aluno_id" bigint NOT NULL,
  "responsavel_id" bigint NOT NULL,
  "parentesco" text
);

