-- Snapshot do schema gerado em 2025-12-10T15:37:12.692Z
-- Fonte: SUPABASE_DB_URL

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
  "ativo" boolean NOT NULL DEFAULT true
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
  "origem_id" bigint
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
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
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
  "updated_at" timestamp with time zone
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
  "quantidade_pedida" integer NOT NULL DEFAULT 0
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
  "fornecedor_principal_id" bigint
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
  "observacoes" text
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
  "cobranca_id" bigint
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
  "contrato_modelo_id" bigint,
  "contrato_emitido_id" bigint,
  "contrato_pdf_url" text,
  "status" USER-DEFINED NOT NULL,
  "ano_referencia" integer,
  "data_matricula" date NOT NULL DEFAULT CURRENT_DATE,
  "data_encerramento" date,
  "observacoes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
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
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
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
  "matricula_id" bigint
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
  "observacoes" text
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

