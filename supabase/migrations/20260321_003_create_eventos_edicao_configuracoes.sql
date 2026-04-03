-- =========================================================
-- MÓDULO: EVENTOS DA ESCOLA
-- FASE: CONFIGURAÇÕES DA EDIÇÃO
-- =========================================================

create table if not exists public.eventos_escola_edicao_configuracoes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null unique references public.eventos_escola_edicoes(id) on delete cascade,
  cobra_taxa_participacao_geral boolean not null default false,
  cobra_por_coreografia boolean not null default false,
  cobra_por_pacote boolean not null default false,
  permite_itens_adicionais boolean not null default false,
  participacao_por_aluno boolean not null default true,
  participacao_por_turma boolean not null default false,
  participacao_por_grupo boolean not null default false,
  participacao_por_coreografia boolean not null default true,
  permite_multiplas_coreografias_aluno boolean not null default false,
  valor_taxa_participacao_centavos integer not null default 0
    check (valor_taxa_participacao_centavos >= 0),
  modo_composicao_valor text not null default 'VALOR_FIXO'
    check (modo_composicao_valor in ('VALOR_FIXO', 'POR_COREOGRAFIA', 'PACOTE', 'PERSONALIZADO')),
  modo_cobranca text not null default 'UNICA'
    check (modo_cobranca in ('UNICA', 'PARCELADA')),
  quantidade_maxima_parcelas integer not null default 1
    check (quantidade_maxima_parcelas >= 1 and quantidade_maxima_parcelas <= 24),
  gera_conta_interna_automaticamente boolean not null default false,
  regras_adicionais jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_edicao_configuracoes_edicao
  on public.eventos_escola_edicao_configuracoes(edicao_id);

create table if not exists public.eventos_escola_edicao_itens_financeiros (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  codigo text,
  nome text not null,
  descricao text,
  tipo_item text not null
    check (tipo_item in ('FIGURINO', 'ENSAIO_EXTRA', 'KIT', 'MIDIA', 'TAXA_ADMINISTRATIVA', 'OUTRO')),
  modo_cobranca text not null default 'UNICO'
    check (modo_cobranca in ('UNICO', 'POR_ALUNO', 'POR_TURMA', 'POR_GRUPO', 'POR_COREOGRAFIA', 'PACOTE')),
  valor_centavos integer not null default 0
    check (valor_centavos >= 0),
  ativo boolean not null default true,
  ordem integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_edicao_itens_financeiros_edicao
  on public.eventos_escola_edicao_itens_financeiros(edicao_id);

create unique index if not exists idx_eventos_escola_edicao_itens_financeiros_codigo
  on public.eventos_escola_edicao_itens_financeiros(edicao_id, codigo)
  where codigo is not null;

comment on table public.eventos_escola_edicao_configuracoes is
'Configurações funcionais e financeiras da edição do evento.';

comment on table public.eventos_escola_edicao_itens_financeiros is
'Itens financeiros configuráveis por edição do evento, sem gerar cobrança real automaticamente.';
