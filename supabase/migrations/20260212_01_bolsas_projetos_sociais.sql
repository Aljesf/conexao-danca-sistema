-- =============================================================================
-- Bolsas & Projetos Sociais (SaaS) — Estrutura base
-- - Projetos sociais configuráveis por escola
-- - Tipos de bolsa configuráveis por projeto
-- - Concessões vinculadas à pessoa (aluno) e opcionalmente à matrícula
-- - Ledger institucional: investimento em bolsas (fora do caixa / fora do financeiro operacional)
-- =============================================================================

begin;
-- 1) Projetos Sociais
create table if not exists public.projetos_sociais (
  id bigserial primary key,
  escola_id bigint null, -- manter null por enquanto se "escola" ainda não estiver modelada como entidade; futuro: FK
  nome text not null,
  descricao text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projetos_sociais_ativo on public.projetos_sociais (ativo);
create index if not exists idx_projetos_sociais_escola on public.projetos_sociais (escola_id);
-- 2) Tipos de Bolsa (configuráveis)
-- modos:
-- INTEGRAL => familia_paga = 0
-- PERCENTUAL => aplica percentual_desconto
-- VALOR_FINAL_FAMILIA => familia_paga = valor_final_familia_centavos
create table if not exists public.bolsa_tipos (
  id bigserial primary key,
  projeto_social_id bigint not null references public.projetos_sociais(id) on delete cascade,
  nome text not null, -- ex: "Integral", "50%", "Simbólica R$ 50"
  modo text not null check (modo in ('INTEGRAL','PERCENTUAL','VALOR_FINAL_FAMILIA')),
  percentual_desconto numeric null check (percentual_desconto is null or (percentual_desconto >= 0 and percentual_desconto <= 100)),
  valor_final_familia_centavos integer null check (valor_final_familia_centavos is null or valor_final_familia_centavos >= 0),
  observacoes text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- integridade do modo:
  constraint chk_bolsa_tipos_modo_campos
    check (
      (modo = 'INTEGRAL' and percentual_desconto is null and valor_final_familia_centavos is null)
      or
      (modo = 'PERCENTUAL' and percentual_desconto is not null and valor_final_familia_centavos is null)
      or
      (modo = 'VALOR_FINAL_FAMILIA' and percentual_desconto is null and valor_final_familia_centavos is not null)
    )
);
create index if not exists idx_bolsa_tipos_projeto on public.bolsa_tipos (projeto_social_id);
create index if not exists idx_bolsa_tipos_ativo on public.bolsa_tipos (ativo);
-- 3) Concessões (bolsa aplicada a uma pessoa/aluno, com vigência e status)
-- Observação: matrícula pode nascer antes/depois; por isso matricula_id é opcional agora.
create table if not exists public.bolsa_concessoes (
  id bigserial primary key,
  projeto_social_id bigint not null references public.projetos_sociais(id) on delete restrict,
  bolsa_tipo_id bigint not null references public.bolsa_tipos(id) on delete restrict,

  pessoa_id bigint not null references public.pessoas(id) on delete restrict, -- aluno (beneficiário)

  matricula_id bigint null, -- FK será adicionada na etapa de matrícula (quando confirmarmos estrutura/caminho)
  turma_id bigint null references public.turmas(turma_id) on delete set null, -- opcional (amarrar concessão a turma)

  data_inicio date not null default current_date,
  data_fim date null,
  status text not null default 'ATIVA' check (status in ('ATIVA','SUSPENSA','ENCERRADA')),

  motivo text null,
  observacoes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bolsa_concessoes_pessoa on public.bolsa_concessoes (pessoa_id);
create index if not exists idx_bolsa_concessoes_status on public.bolsa_concessoes (status);
create index if not exists idx_bolsa_concessoes_projeto on public.bolsa_concessoes (projeto_social_id);
-- 4) Ledger institucional (Investimento em Bolsas)
-- Um registro por competência (YYYY-MM) por pessoa/turma/matrícula (quando houver)
-- Origem do contratado:
-- - MANUAL (valor lançado manualmente na matrícula/turma)
-- - TABELA_PRECOS (quando reativarmos/refatorarmos)
create table if not exists public.bolsa_ledger (
  id bigserial primary key,

  competencia text not null, -- YYYY-MM
  projeto_social_id bigint not null references public.projetos_sociais(id) on delete restrict,
  bolsa_concessao_id bigint not null references public.bolsa_concessoes(id) on delete cascade,

  pessoa_id bigint not null references public.pessoas(id) on delete restrict,
  turma_id bigint null references public.turmas(turma_id) on delete set null,
  matricula_id bigint null, -- FK adicionaremos quando a tabela matriculas estiver confirmada/ativa

  origem_valor_contratado text not null check (origem_valor_contratado in ('MANUAL','TABELA_PRECOS')),
  valor_contratado_centavos integer not null check (valor_contratado_centavos >= 0),
  valor_familia_centavos integer not null check (valor_familia_centavos >= 0),
  valor_investimento_centavos integer not null check (valor_investimento_centavos >= 0),

  composicao_json jsonb null, -- opcional: detalhamento (itens, múltiplas UEs etc.)
  observacoes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_bolsa_ledger_investimento
    check (valor_investimento_centavos = greatest(valor_contratado_centavos - valor_familia_centavos, 0))
);
create index if not exists idx_bolsa_ledger_competencia on public.bolsa_ledger (competencia);
create index if not exists idx_bolsa_ledger_pessoa on public.bolsa_ledger (pessoa_id);
create index if not exists idx_bolsa_ledger_projeto on public.bolsa_ledger (projeto_social_id);
create index if not exists idx_bolsa_ledger_concessao on public.bolsa_ledger (bolsa_concessao_id);
create index if not exists idx_bolsa_ledger_turma on public.bolsa_ledger (turma_id);
create index if not exists idx_bolsa_ledger_matricula on public.bolsa_ledger (matricula_id);
create index if not exists idx_bolsa_ledger_comp_gin on public.bolsa_ledger using gin (composicao_json);
commit;
