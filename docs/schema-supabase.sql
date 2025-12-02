-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alunos (
  id bigint NOT NULL DEFAULT nextval('alunos_id_seq'::regclass),
  nome text NOT NULL,
  email text,
  telefone text,
  data_nascimento date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  user_email text,
  CONSTRAINT alunos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.alunos_turmas (
  id bigint NOT NULL DEFAULT nextval('alunos_turmas_id_seq'::regclass),
  aluno_id bigint NOT NULL,
  turma_id bigint NOT NULL,
  dt_inicio date NOT NULL DEFAULT CURRENT_DATE,
  dt_fim date,
  situacao text NOT NULL DEFAULT 'ativo'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  CONSTRAINT alunos_turmas_pkey PRIMARY KEY (id),
  CONSTRAINT alunos_turmas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.alunos(id),
  CONSTRAINT alunos_turmas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.auditoria_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  acao text NOT NULL,
  entidade text,
  entidade_id text,
  detalhes jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_logs_pkey PRIMARY KEY (id),
  CONSTRAINT auditoria_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);
CREATE TABLE public.avaliacao_aluno_resultado (
  id bigint NOT NULL DEFAULT nextval('avaliacao_aluno_resultado_id_seq'::regclass),
  turma_avaliacao_id bigint NOT NULL,
  pessoa_id bigint NOT NULL,
  conceito_final_id bigint,
  conceitos_por_grupo jsonb,
  observacoes_professor text,
  data_avaliacao date NOT NULL,
  avaliador_id bigint,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_aluno_resultado_pkey PRIMARY KEY (id),
  CONSTRAINT avaliacao_aluno_resultado_turma_avaliacao_id_fkey FOREIGN KEY (turma_avaliacao_id) REFERENCES public.turma_avaliacoes(id),
  CONSTRAINT avaliacao_aluno_resultado_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id),
  CONSTRAINT avaliacao_aluno_resultado_conceito_final_id_fkey FOREIGN KEY (conceito_final_id) REFERENCES public.avaliacoes_conceitos(id),
  CONSTRAINT avaliacao_aluno_resultado_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES public.colaboradores(id)
);
CREATE TABLE public.avaliacoes_conceitos (
  id bigint NOT NULL DEFAULT nextval('avaliacoes_conceitos_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  rotulo text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 1,
  cor_hex text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_conceitos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.avaliacoes_modelo (
  id bigint NOT NULL DEFAULT nextval('avaliacoes_modelo_id_seq'::regclass),
  nome text NOT NULL,
  descricao text,
  tipo_avaliacao USER-DEFINED NOT NULL,
  obrigatoria boolean NOT NULL DEFAULT false,
  grupos jsonb NOT NULL,
  conceitos_ids ARRAY NOT NULL DEFAULT '{}'::bigint[],
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_modelo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bairros (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  cidade text,
  estado text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bairros_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categorias_financeiras (
  id integer NOT NULL DEFAULT nextval('categorias_financeiras_id_seq'::regclass),
  tipo text NOT NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  plano_conta_id integer,
  CONSTRAINT categorias_financeiras_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_financeiras_plano_conta_id_fkey FOREIGN KEY (plano_conta_id) REFERENCES public.plano_contas(id)
);
CREATE TABLE public.centros_custo (
  id integer NOT NULL DEFAULT nextval('centros_custo_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT centros_custo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cobrancas (
  id bigint NOT NULL DEFAULT nextval('cobrancas_id_seq'::regclass),
  pessoa_id bigint NOT NULL,
  descricao text NOT NULL,
  valor_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL'::text,
  vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'PENDENTE'::text,
  metodo_pagamento text,
  neofin_charge_id text,
  neofin_payload jsonb,
  link_pagamento text,
  linha_digitavel text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  centro_custo_id integer,
  origem_tipo text,
  origem_id bigint,
  CONSTRAINT cobrancas_pkey PRIMARY KEY (id),
  CONSTRAINT cobrancas_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id),
  CONSTRAINT cobrancas_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id)
);
CREATE TABLE public.colaborador_funcoes (
  id bigint NOT NULL DEFAULT nextval('colaborador_funcoes_id_seq'::regclass),
  colaborador_id bigint NOT NULL,
  funcao_id integer NOT NULL,
  principal boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT colaborador_funcoes_pkey PRIMARY KEY (id),
  CONSTRAINT colaborador_funcoes_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id),
  CONSTRAINT colaborador_funcoes_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES public.funcoes_colaborador(id)
);
CREATE TABLE public.colaborador_jornada (
  id bigint NOT NULL DEFAULT nextval('colaborador_jornada_id_seq'::regclass),
  colaborador_id bigint NOT NULL,
  tipo_vinculo_id integer,
  inicio_vigencia date NOT NULL,
  fim_vigencia date,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT colaborador_jornada_pkey PRIMARY KEY (id),
  CONSTRAINT colaborador_jornada_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id),
  CONSTRAINT colaborador_jornada_tipo_vinculo_id_fkey FOREIGN KEY (tipo_vinculo_id) REFERENCES public.tipos_vinculo_colaborador(id)
);
CREATE TABLE public.colaborador_jornada_dias (
  id bigint NOT NULL DEFAULT nextval('colaborador_jornada_dias_id_seq'::regclass),
  jornada_id bigint NOT NULL,
  dia_semana text NOT NULL,
  entrada_1 time without time zone,
  saida_1 time without time zone,
  entrada_2 time without time zone,
  saida_2 time without time zone,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT colaborador_jornada_dias_pkey PRIMARY KEY (id),
  CONSTRAINT colaborador_jornada_dias_jornada_id_fkey FOREIGN KEY (jornada_id) REFERENCES public.colaborador_jornada(id)
);
CREATE TABLE public.colaboradores (
  id bigint NOT NULL DEFAULT nextval('colaboradores_id_seq'::regclass),
  pessoa_id integer NOT NULL,
  centro_custo_id integer,
  tipo_vinculo text,
  data_inicio date,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  tipo_vinculo_id integer,
  CONSTRAINT colaboradores_pkey PRIMARY KEY (id),
  CONSTRAINT colaboradores_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id),
  CONSTRAINT colaboradores_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id),
  CONSTRAINT colaboradores_tipo_vinculo_id_fkey FOREIGN KEY (tipo_vinculo_id) REFERENCES public.tipos_vinculo_colaborador(id)
);
CREATE TABLE public.config_pagamento_colaborador (
  id bigint NOT NULL DEFAULT nextval('config_pagamento_colaborador_id_seq'::regclass),
  colaborador_id bigint NOT NULL,
  funcao_id integer,
  modelo_pagamento_id integer NOT NULL,
  valor_centavos integer,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  CONSTRAINT config_pagamento_colaborador_pkey PRIMARY KEY (id),
  CONSTRAINT config_pagamento_colaborador_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id),
  CONSTRAINT config_pagamento_colaborador_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES public.funcoes_colaborador(id),
  CONSTRAINT config_pagamento_colaborador_modelo_pagamento_id_fkey FOREIGN KEY (modelo_pagamento_id) REFERENCES public.modelos_pagamento_colaborador(id)
);
CREATE TABLE public.contas_financeiras (
  id bigint NOT NULL DEFAULT nextval('contas_financeiras_id_seq'::regclass),
  centro_custo_id integer,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL,
  banco text,
  agencia text,
  numero_conta text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contas_financeiras_pkey PRIMARY KEY (id),
  CONSTRAINT contas_financeiras_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id)
);
CREATE TABLE public.contas_pagar (
  id bigint NOT NULL DEFAULT nextval('contas_pagar_id_seq'::regclass),
  centro_custo_id integer NOT NULL,
  categoria_id integer,
  pessoa_id integer,
  descricao text NOT NULL,
  valor_centavos integer NOT NULL,
  vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'PENDENTE'::text,
  metodo_pagamento text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contas_pagar_pkey PRIMARY KEY (id),
  CONSTRAINT contas_pagar_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id),
  CONSTRAINT contas_pagar_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_financeiras(id),
  CONSTRAINT contas_pagar_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
);
CREATE TABLE public.contas_pagar_pagamentos (
  id bigint NOT NULL DEFAULT nextval('contas_pagar_pagamentos_id_seq'::regclass),
  conta_pagar_id bigint NOT NULL,
  centro_custo_id integer NOT NULL,
  conta_financeira_id integer,
  valor_principal_centavos integer NOT NULL,
  juros_centavos integer NOT NULL DEFAULT 0,
  desconto_centavos integer NOT NULL DEFAULT 0,
  data_pagamento date NOT NULL,
  metodo_pagamento text,
  observacoes text,
  usuario_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contas_pagar_pagamentos_pkey PRIMARY KEY (id),
  CONSTRAINT contas_pagar_pagamentos_conta_pagar_id_fkey FOREIGN KEY (conta_pagar_id) REFERENCES public.contas_pagar(id),
  CONSTRAINT contas_pagar_pagamentos_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id),
  CONSTRAINT contas_pagar_pagamentos_conta_financeira_id_fkey FOREIGN KEY (conta_financeira_id) REFERENCES public.contas_financeiras(id)
);
CREATE TABLE public.cursos (
  id bigint NOT NULL DEFAULT nextval('cursos_id_seq'::regclass),
  nome text NOT NULL,
  metodologia text,
  situacao text NOT NULL DEFAULT 'Ativo'::text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cursos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.endereco (
  endereco_id bigint NOT NULL DEFAULT nextval('endereco_endereco_id_seq'::regclass),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  CONSTRAINT endereco_pkey PRIMARY KEY (endereco_id)
);
CREATE TABLE public.enderecos (
  id bigint NOT NULL DEFAULT nextval('enderecos_id_seq'::regclass),
  logradouro text NOT NULL,
  numero text,
  complemento text,
  bairro text,
  cidade text NOT NULL,
  uf character NOT NULL,
  cep text,
  referencia text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT enderecos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.enderecos_pessoa (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pessoa_id bigint UNIQUE,
  rua_id uuid,
  bairro_id uuid,
  logradouro text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  numero text,
  complemento text,
  referencia text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT enderecos_pessoa_pkey PRIMARY KEY (id),
  CONSTRAINT enderecos_pessoa_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id),
  CONSTRAINT enderecos_pessoa_rua_id_fkey FOREIGN KEY (rua_id) REFERENCES public.ruas(id),
  CONSTRAINT enderecos_pessoa_bairro_id_fkey FOREIGN KEY (bairro_id) REFERENCES public.bairros(id)
);
CREATE TABLE public.funcoes_colaborador (
  id integer NOT NULL DEFAULT nextval('funcoes_colaborador_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  grupo text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  grupo_id bigint,
  CONSTRAINT funcoes_colaborador_pkey PRIMARY KEY (id),
  CONSTRAINT funcoes_colaborador_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.funcoes_grupo(id)
);
CREATE TABLE public.funcoes_grupo (
  id bigint NOT NULL DEFAULT nextval('funcoes_grupo_id_seq'::regclass),
  nome text NOT NULL,
  pode_lecionar boolean NOT NULL DEFAULT false,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer,
  centro_custo_id bigint,
  CONSTRAINT funcoes_grupo_pkey PRIMARY KEY (id),
  CONSTRAINT funcoes_grupo_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id)
);
CREATE TABLE public.habilidades (
  id bigint NOT NULL DEFAULT nextval('habilidades_id_seq'::regclass),
  curso_id bigint NOT NULL,
  nivel_id bigint NOT NULL,
  modulo_id bigint NOT NULL,
  nome text NOT NULL,
  tipo text,
  descricao text,
  criterio_avaliacao text,
  ordem integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT habilidades_pkey PRIMARY KEY (id),
  CONSTRAINT habilidades_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
  CONSTRAINT habilidades_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES public.niveis(id),
  CONSTRAINT habilidades_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id)
);
CREATE TABLE public.modelos_pagamento_colaborador (
  id integer NOT NULL DEFAULT nextval('modelos_pagamento_colaborador_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL,
  descricao text,
  unidade text,
  centro_custo_id integer,
  categoria_financeira_id integer,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT modelos_pagamento_colaborador_pkey PRIMARY KEY (id),
  CONSTRAINT modelos_pagamento_colaborador_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id),
  CONSTRAINT modelos_pagamento_colaborador_categoria_financeira_id_fkey FOREIGN KEY (categoria_financeira_id) REFERENCES public.categorias_financeiras(id)
);
CREATE TABLE public.modulos (
  id bigint NOT NULL DEFAULT nextval('modulos_id_seq'::regclass),
  curso_id bigint NOT NULL,
  nivel_id bigint NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 1,
  obrigatorio boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT modulos_pkey PRIMARY KEY (id),
  CONSTRAINT modulos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
  CONSTRAINT modulos_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES public.niveis(id)
);
CREATE TABLE public.movimento_financeiro (
  id bigint NOT NULL DEFAULT nextval('movimento_financeiro_id_seq'::regclass),
  tipo text NOT NULL,
  centro_custo_id integer NOT NULL,
  valor_centavos integer NOT NULL,
  data_movimento timestamp with time zone NOT NULL,
  origem text NOT NULL,
  origem_id bigint,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  usuario_id uuid,
  CONSTRAINT movimento_financeiro_pkey PRIMARY KEY (id),
  CONSTRAINT movimento_financeiro_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id)
);
CREATE TABLE public.niveis (
  id bigint NOT NULL DEFAULT nextval('niveis_id_seq'::regclass),
  curso_id bigint NOT NULL,
  nome text NOT NULL,
  faixa_etaria_sugerida text,
  pre_requisito_nivel_id bigint,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  idade_minima integer,
  idade_maxima integer,
  CONSTRAINT niveis_pkey PRIMARY KEY (id),
  CONSTRAINT niveis_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
  CONSTRAINT niveis_pre_requisito_nivel_id_fkey FOREIGN KEY (pre_requisito_nivel_id) REFERENCES public.niveis(id)
);
CREATE TABLE public.pessoas (
  id bigint NOT NULL DEFAULT nextval('pessoas_id_seq'::regclass),
  user_id uuid,
  nome text NOT NULL,
  email text,
  telefone text,
  nascimento date,
  cpf text,
  endereco jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tipo_pessoa text DEFAULT 'FISICA'::text,
  ativo boolean DEFAULT true,
  observacoes text,
  neofin_customer_id text,
  created_by uuid,
  updated_by uuid,
  foto_url text,
  nome_social text,
  genero USER-DEFINED NOT NULL DEFAULT 'NAO_INFORMADO'::genero_pessoa,
  estado_civil USER-DEFINED,
  nacionalidade text,
  naturalidade text,
  telefone_secundario text,
  cnpj text,
  razao_social text,
  nome_fantasia text,
  inscricao_estadual text,
  endereco_id bigint,
  CONSTRAINT pessoas_pkey PRIMARY KEY (id),
  CONSTRAINT pessoas_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(user_id),
  CONSTRAINT pessoas_updated_by_fk FOREIGN KEY (updated_by) REFERENCES public.profiles(user_id),
  CONSTRAINT pessoas_endereco_id_fkey FOREIGN KEY (endereco_id) REFERENCES public.enderecos(id),
  CONSTRAINT pessoas_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT pessoas_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.pessoas_roles (
  id bigint NOT NULL DEFAULT nextval('pessoas_roles_id_seq'::regclass),
  pessoa_id bigint NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pessoas_roles_pkey PRIMARY KEY (id),
  CONSTRAINT pessoas_roles_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
);
CREATE TABLE public.plano_contas (
  id integer NOT NULL DEFAULT nextval('plano_contas_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL,
  parent_id integer,
  CONSTRAINT plano_contas_pkey PRIMARY KEY (id),
  CONSTRAINT plano_contas_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.plano_contas(id)
);
CREATE TABLE public.professores (
  id bigint NOT NULL DEFAULT nextval('professores_id_seq'::regclass),
  colaborador_id bigint NOT NULL,
  tipo_professor_id integer,
  bio text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  CONSTRAINT professores_pkey PRIMARY KEY (id),
  CONSTRAINT professores_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id),
  CONSTRAINT professores_tipo_professor_id_fkey FOREIGN KEY (tipo_professor_id) REFERENCES public.tipos_professor(id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  full_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pessoa_id integer NOT NULL UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT profiles_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
);
CREATE TABLE public.recebimentos (
  id bigint NOT NULL DEFAULT nextval('recebimentos_id_seq'::regclass),
  cobranca_id bigint,
  centro_custo_id integer,
  valor_centavos integer NOT NULL,
  data_pagamento timestamp with time zone NOT NULL,
  metodo_pagamento text NOT NULL,
  origem_sistema text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recebimentos_pkey PRIMARY KEY (id),
  CONSTRAINT recebimentos_cobranca_id_fkey FOREIGN KEY (cobranca_id) REFERENCES public.cobrancas(id),
  CONSTRAINT recebimentos_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centros_custo(id)
);
CREATE TABLE public.roles_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  editavel boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  permissoes jsonb,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT roles_sistema_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ruas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bairro_id uuid,
  nome text NOT NULL,
  cep text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ruas_pkey PRIMARY KEY (id),
  CONSTRAINT ruas_bairro_id_fkey FOREIGN KEY (bairro_id) REFERENCES public.bairros(id)
);
CREATE TABLE public.tipos_professor (
  id integer NOT NULL DEFAULT nextval('tipos_professor_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  CONSTRAINT tipos_professor_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_vinculo_colaborador (
  id integer NOT NULL DEFAULT nextval('tipos_vinculo_colaborador_id_seq'::regclass),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  usa_jornada boolean NOT NULL DEFAULT false,
  usa_vigencia boolean NOT NULL DEFAULT true,
  eh_professor_por_natureza boolean NOT NULL DEFAULT false,
  gera_folha boolean NOT NULL DEFAULT false,
  exige_config_pagamento boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT tipos_vinculo_colaborador_pkey PRIMARY KEY (id)
);
CREATE TABLE public.turma_aluno (
  turma_aluno_id bigint NOT NULL DEFAULT nextval('turma_aluno_turma_aluno_id_seq'::regclass),
  turma_id bigint NOT NULL,
  aluno_pessoa_id bigint NOT NULL,
  dt_inicio date DEFAULT CURRENT_DATE,
  dt_fim date,
  status text DEFAULT 'ativo'::text,
  CONSTRAINT turma_aluno_pkey PRIMARY KEY (turma_aluno_id),
  CONSTRAINT turma_aluno_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(turma_id)
);
CREATE TABLE public.turma_avaliacoes (
  id bigint NOT NULL DEFAULT nextval('turma_avaliacoes_id_seq'::regclass),
  turma_id bigint NOT NULL,
  avaliacao_modelo_id bigint NOT NULL,
  titulo text NOT NULL,
  descricao text,
  obrigatoria boolean NOT NULL DEFAULT false,
  data_prevista date,
  data_realizada date,
  status text NOT NULL DEFAULT 'RASCUNHO'::text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT turma_avaliacoes_pkey PRIMARY KEY (id),
  CONSTRAINT turma_avaliacoes_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(turma_id),
  CONSTRAINT turma_avaliacoes_avaliacao_modelo_id_fkey FOREIGN KEY (avaliacao_modelo_id) REFERENCES public.avaliacoes_modelo(id)
);
CREATE TABLE public.turma_niveis (
  id bigint NOT NULL DEFAULT nextval('turma_niveis_id_seq'::regclass),
  turma_id bigint NOT NULL,
  nivel_id bigint NOT NULL,
  principal boolean NOT NULL DEFAULT false,
  CONSTRAINT turma_niveis_pkey PRIMARY KEY (id),
  CONSTRAINT turma_niveis_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(turma_id),
  CONSTRAINT turma_niveis_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES public.niveis(id)
);
CREATE TABLE public.turma_professores (
  id bigint NOT NULL DEFAULT nextval('turma_professores_id_seq'::regclass),
  turma_id bigint NOT NULL,
  colaborador_id bigint NOT NULL,
  funcao_id bigint NOT NULL,
  principal boolean NOT NULL DEFAULT false,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  CONSTRAINT turma_professores_pkey PRIMARY KEY (id),
  CONSTRAINT turma_professores_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(turma_id),
  CONSTRAINT turma_professores_colaborador_id_fkey FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id),
  CONSTRAINT turma_professores_funcao_id_fkey FOREIGN KEY (funcao_id) REFERENCES public.funcoes_colaborador(id)
);
CREATE TABLE public.turmas (
  turma_id bigint NOT NULL DEFAULT nextval('turmas_turma_id_seq'::regclass),
  nome text NOT NULL,
  curso text,
  nivel text,
  capacidade integer,
  dias_semana ARRAY,
  hora_inicio time without time zone,
  hora_fim time without time zone,
  ativo boolean DEFAULT true,
  professor_id bigint,
  user_email text,
  created_at timestamp with time zone DEFAULT now(),
  tipo_turma text DEFAULT 'REGULAR'::text CHECK (tipo_turma = ANY (ARRAY['REGULAR'::text, 'CURSO_LIVRE'::text, 'ENSAIO'::text])),
  turno text CHECK (turno = ANY (ARRAY['MANHA'::text, 'TARDE'::text, 'NOITE'::text, 'INTEGRAL'::text])),
  ano_referencia integer,
  data_inicio date,
  data_fim date,
  status text DEFAULT 'EM_PREPARACAO'::text CHECK (status = ANY (ARRAY['EM_PREPARACAO'::text, 'ATIVA'::text, 'ENCERRADA'::text, 'CANCELADA'::text])),
  encerramento_automatico boolean DEFAULT false,
  periodo_letivo_id bigint,
  carga_horaria_prevista numeric,
  frequencia_minima_percentual numeric,
  observacoes text,
  CONSTRAINT turmas_pkey PRIMARY KEY (turma_id)
);
CREATE TABLE public.turmas_horarios (
  id bigint NOT NULL DEFAULT nextval('turmas_horarios_id_seq'::regclass),
  turma_id bigint NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  inicio time without time zone NOT NULL,
  fim time without time zone NOT NULL,
  CONSTRAINT turmas_horarios_pkey PRIMARY KEY (id),
  CONSTRAINT turmas_horarios_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(turma_id)
);
CREATE TABLE public.usuario_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_roles_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles_sistema(id),
  CONSTRAINT usuario_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);
CREATE TABLE public.vinculos (
  id bigint NOT NULL DEFAULT nextval('vinculos_id_seq'::regclass),
  aluno_id bigint NOT NULL,
  responsavel_id bigint NOT NULL,
  parentesco text,
  CONSTRAINT vinculos_pkey PRIMARY KEY (id),
  CONSTRAINT vinculos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.pessoas(id),
  CONSTRAINT vinculos_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.pessoas(id)
);