-- =========================================================
-- MÓDULO: EVENTOS DA ESCOLA
-- CONTEXTO PADRÃO: ESCOLA
-- CENTRO DE CUSTO PADRÃO: ESCOLA
-- FASE: SQL BASE CONSOLIDADA
-- =========================================================

-- =========================================================
-- 0. ENUMS
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_tipo_enum') then
    create type public.evento_tipo_enum as enum (
      'REUNIAO',
      'FESTIVAL',
      'MOSTRA',
      'ESPETACULO',
      'WORKSHOP',
      'FESTA',
      'AUDICAO',
      'AULA_ABERTA',
      'APRESENTACAO_EXTERNA',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_natureza_enum') then
    create type public.evento_natureza_enum as enum (
      'PEDAGOGICO',
      'ARTISTICO',
      'INSTITUCIONAL',
      'COMERCIAL',
      'SOCIAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_abrangencia_enum') then
    create type public.evento_abrangencia_enum as enum (
      'INTERNO',
      'EXTERNO',
      'HIBRIDO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_status_enum') then
    create type public.evento_status_enum as enum (
      'EM_PLANEJAMENTO',
      'INSCRICOES_ABERTAS',
      'EM_ANDAMENTO',
      'ENCERRADO',
      'CANCELADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_dia_status_enum') then
    create type public.evento_dia_status_enum as enum (
      'PLANEJADO',
      'CONFIRMADO',
      'EM_EXECUCAO',
      'ENCERRADO',
      'CANCELADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_sessao_status_enum') then
    create type public.evento_sessao_status_enum as enum (
      'PLANEJADA',
      'ABERTA',
      'EM_EXECUCAO',
      'ENCERRADA',
      'CANCELADA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_sessao_tipo_enum') then
    create type public.evento_sessao_tipo_enum as enum (
      'MANHA',
      'TARDE',
      'NOITE',
      'EXTRA',
      'ENSAIO',
      'APRESENTACAO',
      'WORKSHOP',
      'CERIMONIA',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_atividade_tipo_enum') then
    create type public.evento_atividade_tipo_enum as enum (
      'CREDENCIAMENTO',
      'ABERTURA',
      'ENSAIO',
      'ENSAIO_GERAL',
      'ENTREGA_FIGURINO',
      'CAMARIM',
      'APRESENTACAO',
      'PREMIACAO',
      'INTERVALO',
      'WORKSHOP',
      'REUNIAO',
      'MONTAGEM',
      'DESMONTAGEM',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_modalidade_tipo_enum') then
    create type public.evento_modalidade_tipo_enum as enum (
      'INSCRICAO',
      'PARTICIPACAO',
      'COREOGRAFIA',
      'SOLO',
      'DUO',
      'TRIO',
      'GRUPO',
      'FIGURINO',
      'WORKSHOP',
      'ITEM_COMPLEMENTAR',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_inscricao_status_enum') then
    create type public.evento_inscricao_status_enum as enum (
      'RASCUNHO',
      'CONFIRMADA',
      'CANCELADA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_financeiro_status_enum') then
    create type public.evento_financeiro_status_enum as enum (
      'NAO_GERADO',
      'PENDENTE',
      'PARCIAL',
      'PAGO',
      'ISENTO',
      'CANCELADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_inscricao_item_status_enum') then
    create type public.evento_inscricao_item_status_enum as enum (
      'ATIVO',
      'CANCELADO',
      'ISENTO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_turma_vinculo_tipo_enum') then
    create type public.evento_turma_vinculo_tipo_enum as enum (
      'ENSAIO',
      'CURSO_LIVRE',
      'OFICINA',
      'APOIO',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_contratacao_status_enum') then
    create type public.evento_contratacao_status_enum as enum (
      'RASCUNHO',
      'CONTRATADO',
      'EM_EXECUCAO',
      'CONCLUIDO',
      'CANCELADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_fin_ref_natureza_enum') then
    create type public.evento_fin_ref_natureza_enum as enum (
      'RECEITA',
      'DESPESA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_fin_ref_origem_enum') then
    create type public.evento_fin_ref_origem_enum as enum (
      'INSCRICAO_EVENTO',
      'ITEM_INSCRICAO_EVENTO',
      'CONTA_INTERNA',
      'COBRANCA',
      'RECEBIMENTO',
      'CONTA_PAGAR',
      'PAGAMENTO_CONTA_PAGAR',
      'MOVIMENTO_FINANCEIRO',
      'INGRESSO',
      'PEDIDO_INGRESSO',
      'AJUSTE_MANUAL'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_setor_tipo_enum') then
    create type public.evento_setor_tipo_enum as enum (
      'PLATEIA',
      'CAMAROTE',
      'VIP',
      'ARQUIBANCADA',
      'MESA',
      'AREA_LIVRE',
      'OUTRO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_ingresso_pedido_status_enum') then
    create type public.evento_ingresso_pedido_status_enum as enum (
      'RASCUNHO',
      'RESERVADO',
      'AGUARDANDO_PAGAMENTO',
      'PAGO',
      'CANCELADO',
      'EXPIRADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_ingresso_status_enum') then
    create type public.evento_ingresso_status_enum as enum (
      'DISPONIVEL',
      'RESERVADO',
      'VENDIDO',
      'CANCELADO',
      'BLOQUEADO'
    );
  end if;
end $$;

-- =========================================================
-- 1. EVENTO (BASE MACRO)
-- =========================================================

create table if not exists public.eventos_escola (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo_evento public.evento_tipo_enum not null,
  natureza_evento public.evento_natureza_enum not null,
  abrangencia_evento public.evento_abrangencia_enum not null,
  contexto text not null default 'ESCOLA',
  centro_custo_codigo text not null default 'ESCOLA',
  publico_alvo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eventos_escola
  drop constraint if exists chk_eventos_escola_contexto;

alter table public.eventos_escola
  add constraint chk_eventos_escola_contexto
  check (contexto = 'ESCOLA');

-- =========================================================
-- 2. EDIÇÃO DO EVENTO (REALIZAÇÃO CONCRETA)
-- =========================================================

create table if not exists public.eventos_escola_edicoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos_escola(id) on delete cascade,
  titulo_exibicao text not null,
  tema text,
  ano_referencia integer not null,
  status public.evento_status_enum not null default 'EM_PLANEJAMENTO',
  data_inicio timestamptz,
  data_fim timestamptz,
  local_principal_nome text,
  local_principal_endereco text,
  local_principal_cidade text,
  regulamento_resumo text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_eventos_escola_edicoes_unq
  on public.eventos_escola_edicoes(evento_id, ano_referencia, titulo_exibicao);

-- =========================================================
-- 3. LOCAIS DA EDIÇÃO
-- =========================================================

create table if not exists public.eventos_escola_locais (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  nome_local text not null,
  endereco text,
  cidade text,
  observacoes text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 4. DIAS DO EVENTO
-- Um festival pode durar vários dias.
-- =========================================================

create table if not exists public.eventos_escola_dias (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  data_evento date not null,
  titulo text,
  ordem integer,
  status public.evento_dia_status_enum not null default 'PLANEJADO',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edicao_id, data_evento)
);

-- =========================================================
-- 5. SESSÕES / TURNOS / BLOCOS
-- Sessão é a unidade operacional que pode:
-- - ter agenda própria
-- - ter local
-- - vender ingresso
-- - usar mapa de assentos
-- =========================================================

create table if not exists public.eventos_escola_sessoes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  dia_id uuid not null references public.eventos_escola_dias(id) on delete cascade,
  local_id uuid references public.eventos_escola_locais(id) on delete set null,

  titulo text not null,
  subtitulo text,
  tipo_sessao public.evento_sessao_tipo_enum not null default 'OUTRO',

  hora_inicio time,
  hora_fim time,
  ordem integer,

  status public.evento_sessao_status_enum not null default 'PLANEJADA',

  capacidade_total integer,
  exige_ingresso boolean not null default false,
  usa_mapa_lugares boolean not null default false,
  permite_publico_externo boolean not null default true,

  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 6. ATIVIDADES DA SESSÃO
-- Cada sessão pode ter vários momentos internos.
-- =========================================================

create table if not exists public.eventos_escola_sessao_atividades (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.eventos_escola_sessoes(id) on delete cascade,
  local_id uuid references public.eventos_escola_locais(id) on delete set null,

  tipo_atividade public.evento_atividade_tipo_enum not null,
  titulo text not null,
  descricao text,

  inicio timestamptz,
  fim timestamptz,

  ordem integer,
  aberta_ao_publico boolean not null default false,

  coreografia_id uuid,
  turma_id bigint,

  observacoes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 7. SUBEVENTOS OPCIONAIS
-- Só usar quando houver operação independente.
-- =========================================================

create table if not exists public.eventos_escola_subeventos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  sessao_id uuid references public.eventos_escola_sessoes(id) on delete set null,

  titulo text not null,
  descricao text,

  usa_inscricao_propria boolean not null default false,
  usa_financeiro_proprio boolean not null default false,
  usa_elenco_proprio boolean not null default false,

  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 8. MODALIDADES E PREÇOS DE INSCRIÇÃO DO EVENTO
-- Estas são taxas de participação, coreografia, figurino etc.
-- Não são bilheteria.
-- =========================================================

create table if not exists public.eventos_escola_modalidades (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  codigo text,
  nome text not null,
  tipo_modalidade public.evento_modalidade_tipo_enum not null,
  descricao text,
  obrigatoria boolean not null default false,
  permite_multiplas_unidades boolean not null default false,
  quantidade_minima integer,
  quantidade_maxima integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_eventos_escola_modalidades_codigo
  on public.eventos_escola_modalidades(edicao_id, codigo)
  where codigo is not null;

create table if not exists public.eventos_escola_modalidade_precos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  modalidade_id uuid not null references public.eventos_escola_modalidades(id) on delete cascade,
  titulo text,
  valor_centavos integer not null check (valor_centavos >= 0),
  vigencia_inicio date,
  vigencia_fim date,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9. INSCRIÇÕES NO EVENTO
-- Participante padrão: aluno/pessoa da escola.
-- Financeiro preparado para conta interna em fase posterior.
-- =========================================================

create table if not exists public.eventos_escola_inscricoes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,

  pessoa_id bigint not null,
  aluno_pessoa_id bigint,
  responsavel_financeiro_id bigint,

  conta_interna_id bigint,

  status_inscricao public.evento_inscricao_status_enum not null default 'RASCUNHO',
  status_financeiro public.evento_financeiro_status_enum not null default 'NAO_GERADO',

  data_inscricao timestamptz not null default now(),
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_inscricoes_edicao
  on public.eventos_escola_inscricoes(edicao_id);

create index if not exists idx_eventos_escola_inscricoes_pessoa
  on public.eventos_escola_inscricoes(pessoa_id);

create index if not exists idx_eventos_escola_inscricoes_aluno
  on public.eventos_escola_inscricoes(aluno_pessoa_id);

create table if not exists public.eventos_escola_inscricao_itens (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references public.eventos_escola_inscricoes(id) on delete cascade,
  modalidade_id uuid references public.eventos_escola_modalidades(id) on delete set null,
  subevento_id uuid references public.eventos_escola_subeventos(id) on delete set null,

  descricao text,
  quantidade integer not null default 1 check (quantidade > 0),

  valor_unitario_centavos integer not null default 0 check (valor_unitario_centavos >= 0),
  valor_total_centavos integer not null default 0 check (valor_total_centavos >= 0),

  obrigatorio boolean not null default false,

  origem_financeira text not null default 'EVENTO_ESCOLA',
  lancamento_conta_interna_id bigint,

  status public.evento_inscricao_item_status_enum not null default 'ATIVO',
  observacoes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_inscricao_itens_inscricao
  on public.eventos_escola_inscricao_itens(inscricao_id);

-- =========================================================
-- 10. COREOGRAFIAS E ELENCO
-- =========================================================

create table if not exists public.eventos_escola_coreografias (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  subevento_id uuid references public.eventos_escola_subeventos(id) on delete set null,

  titulo text not null,
  categoria text,
  estilo text,

  professor_responsavel_id bigint,
  turma_base_id bigint,

  duracao_estimada_segundos integer,
  ordem_apresentacao integer,

  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_coreografias_edicao
  on public.eventos_escola_coreografias(edicao_id);

create table if not exists public.eventos_escola_coreografia_participantes (
  id uuid primary key default gen_random_uuid(),
  coreografia_id uuid not null references public.eventos_escola_coreografias(id) on delete cascade,
  pessoa_id bigint not null,
  papel text,
  observacoes text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_eventos_escola_coreografia_participante_unq
  on public.eventos_escola_coreografia_participantes(coreografia_id, pessoa_id);

-- =========================================================
-- 11. VÍNCULO COM TURMAS CANÔNICAS
-- Turma ENSAIO / CURSO_LIVRE permanece em public.turmas.
-- Aqui criamos apenas a ponte oficial do módulo de eventos.
-- =========================================================

create table if not exists public.eventos_escola_turmas_vinculos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  sessao_id uuid references public.eventos_escola_sessoes(id) on delete set null,
  turma_id bigint not null references public.turmas(turma_id) on delete restrict,
  tipo_vinculo public.evento_turma_vinculo_tipo_enum not null,
  coreografia_id uuid references public.eventos_escola_coreografias(id) on delete set null,
  descricao text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_eventos_escola_turmas_vinculos_unq
  on public.eventos_escola_turmas_vinculos(edicao_id, turma_id, tipo_vinculo);

-- =========================================================
-- 12. CONTRATAÇÕES / SERVIÇOS / DESPESAS PREVISTAS
-- Não substitui contas_pagar nem contratos acessórios.
-- É a camada de governança do evento.
-- =========================================================

create table if not exists public.eventos_escola_contratacoes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  sessao_id uuid references public.eventos_escola_sessoes(id) on delete set null,

  prestador_pessoa_id bigint,
  tipo_servico text not null,
  descricao text,

  valor_previsto_centavos integer not null default 0 check (valor_previsto_centavos >= 0),
  valor_contratado_centavos integer check (valor_contratado_centavos is null or valor_contratado_centavos >= 0),

  contrato_acessorio_emitido_id bigint,
  conta_pagar_id bigint,

  status public.evento_contratacao_status_enum not null default 'RASCUNHO',
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_contratacoes_edicao
  on public.eventos_escola_contratacoes(edicao_id);

-- =========================================================
-- 13. REFERÊNCIAS FINANCEIRAS
-- Serve para apurar resultado do evento sem duplicar o financeiro.
-- =========================================================

create table if not exists public.eventos_escola_financeiro_referencias (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  sessao_id uuid references public.eventos_escola_sessoes(id) on delete set null,

  natureza public.evento_fin_ref_natureza_enum not null,
  origem_tipo public.evento_fin_ref_origem_enum not null,
  origem_id bigint,

  pessoa_id bigint,
  descricao text,

  valor_previsto_centavos integer check (valor_previsto_centavos is null or valor_previsto_centavos >= 0),
  valor_real_centavos integer check (valor_real_centavos is null or valor_real_centavos >= 0),

  conta_interna_id bigint,
  cobranca_id bigint,
  recebimento_id bigint,
  conta_pagar_id bigint,
  pagamento_conta_pagar_id bigint,
  movimento_financeiro_id bigint,

  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_financeiro_referencias_edicao
  on public.eventos_escola_financeiro_referencias(edicao_id);

create index if not exists idx_eventos_escola_financeiro_referencias_origem
  on public.eventos_escola_financeiro_referencias(origem_tipo, origem_id);

-- =========================================================
-- 14. BILHETERIA / INGRESSOS / MARCAÇÃO DE LUGARES
-- Ligado à sessão.
-- =========================================================

create table if not exists public.eventos_escola_sessao_setores (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.eventos_escola_sessoes(id) on delete cascade,
  nome text not null,
  tipo_setor public.evento_setor_tipo_enum not null default 'PLATEIA',
  capacidade integer check (capacidade is null or capacidade >= 0),
  ordem integer,
  usa_assento_marcado boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos_escola_sessao_assentos (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.eventos_escola_sessao_setores(id) on delete cascade,
  codigo text not null,
  linha text,
  numero text,
  ordem integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (setor_id, codigo)
);

create table if not exists public.eventos_escola_sessao_ingresso_tipos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.eventos_escola_sessoes(id) on delete cascade,
  setor_id uuid references public.eventos_escola_sessao_setores(id) on delete set null,

  codigo text,
  nome text not null,
  descricao text,

  quantidade_total integer check (quantidade_total is null or quantidade_total >= 0),
  valor_centavos integer not null default 0 check (valor_centavos >= 0),

  meia_entrada boolean not null default false,
  ativo boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists public.eventos_escola_sessao_ingresso_lotes (
  id uuid primary key default gen_random_uuid(),
  ingresso_tipo_id uuid not null references public.eventos_escola_sessao_ingresso_tipos(id) on delete cascade,
  nome text not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  quantidade integer check (quantidade is null or quantidade >= 0),
  inicio_vendas timestamptz,
  fim_vendas timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos_escola_sessao_ingresso_pedidos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.eventos_escola_sessoes(id) on delete cascade,

  comprador_pessoa_id bigint,
  responsavel_financeiro_id bigint,

  status public.evento_ingresso_pedido_status_enum not null default 'RASCUNHO',

  valor_total_centavos integer not null default 0 check (valor_total_centavos >= 0),

  cobranca_id bigint,
  recebimento_id bigint,

  expira_em timestamptz,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eventos_escola_sessao_ingressos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.eventos_escola_sessao_ingresso_pedidos(id) on delete set null,
  sessao_id uuid not null references public.eventos_escola_sessoes(id) on delete cascade,
  ingresso_tipo_id uuid references public.eventos_escola_sessao_ingresso_tipos(id) on delete set null,
  lote_id uuid references public.eventos_escola_sessao_ingresso_lotes(id) on delete set null,
  setor_id uuid references public.eventos_escola_sessao_setores(id) on delete set null,
  assento_id uuid references public.eventos_escola_sessao_assentos(id) on delete set null,

  codigo_ingresso text,
  nome_portador text,
  documento_portador text,

  valor_centavos integer not null default 0 check (valor_centavos >= 0),
  status public.evento_ingresso_status_enum not null default 'DISPONIVEL',

  reservado_em timestamptz,
  vendido_em timestamptz,
  cancelado_em timestamptz,

  created_at timestamptz not null default now(),

  unique (sessao_id, assento_id)
);

create index if not exists idx_eventos_escola_sessao_ingressos_pedido
  on public.eventos_escola_sessao_ingressos(pedido_id);

create index if not exists idx_eventos_escola_sessao_ingressos_sessao_status
  on public.eventos_escola_sessao_ingressos(sessao_id, status);

-- =========================================================
-- 15. COMENTÁRIOS
-- =========================================================

comment on table public.eventos_escola is
'Módulo canônico de eventos da escola. Sempre no contexto ESCOLA e centro de custo ESCOLA.';

comment on table public.eventos_escola_edicoes is
'Edição operacional do evento. Ex.: Brasilidades 2026.';

comment on table public.eventos_escola_dias is
'Calendário próprio da edição do evento.';

comment on table public.eventos_escola_sessoes is
'Sessões/turnos/blocos operacionais da edição. Podem ter ingresso e mapa de lugares.';

comment on table public.eventos_escola_sessao_atividades is
'Atividades internas de cada sessão.';

comment on table public.eventos_escola_turmas_vinculos is
'Ponte entre edição/sessão do evento e turmas canônicas, especialmente ENSAIO e CURSO_LIVRE.';

comment on table public.eventos_escola_contratacoes is
'Camada operacional para serviços, fornecedores e custos previstos/contratados do evento.';

comment on table public.eventos_escola_financeiro_referencias is
'Rastreabilidade de receita e despesa do evento sem substituir o módulo financeiro canônico.';

comment on table public.eventos_escola_sessao_ingresso_pedidos is
'Pedidos de ingresso da sessão. Podem gerar cobrança e recebimento em fase posterior.';

comment on table public.eventos_escola_sessao_ingressos is
'Ingressos unitários da sessão, com suporte a setor e assento marcado.';

-- =========================================================
-- 16. ÍNDICES COMPLEMENTARES
-- =========================================================

create index if not exists idx_eventos_escola_edicoes_evento
  on public.eventos_escola_edicoes(evento_id);

create index if not exists idx_eventos_escola_dias_edicao
  on public.eventos_escola_dias(edicao_id);

create index if not exists idx_eventos_escola_sessoes_edicao
  on public.eventos_escola_sessoes(edicao_id);

create index if not exists idx_eventos_escola_sessoes_dia
  on public.eventos_escola_sessoes(dia_id);

create index if not exists idx_eventos_escola_sessao_atividades_sessao
  on public.eventos_escola_sessao_atividades(sessao_id);

create index if not exists idx_eventos_escola_modalidades_edicao
  on public.eventos_escola_modalidades(edicao_id);

create index if not exists idx_eventos_escola_modalidade_precos_edicao
  on public.eventos_escola_modalidade_precos(edicao_id);

create index if not exists idx_eventos_escola_coreografia_participantes_pessoa
  on public.eventos_escola_coreografia_participantes(pessoa_id);

create index if not exists idx_eventos_escola_sessao_setores_sessao
  on public.eventos_escola_sessao_setores(sessao_id);

create index if not exists idx_eventos_escola_sessao_assentos_setor
  on public.eventos_escola_sessao_assentos(setor_id);

create index if not exists idx_eventos_escola_sessao_ingresso_tipos_sessao
  on public.eventos_escola_sessao_ingresso_tipos(sessao_id);

create index if not exists idx_eventos_escola_sessao_ingresso_lotes_tipo
  on public.eventos_escola_sessao_ingresso_lotes(ingresso_tipo_id);

create index if not exists idx_eventos_escola_sessao_ingresso_pedidos_sessao
  on public.eventos_escola_sessao_ingresso_pedidos(sessao_id);

-- =========================================================
-- 17. OBSERVAÇÕES IMPORTANTES PARA AS PRÓXIMAS ETAPAS
-- =========================================================
-- 1. Receita de inscrição do evento:
--    continuará preparada para gerar lançamentos na conta interna do aluno via API.
--
-- 2. Receita de bilheteria:
--    deverá integrar com cobrancas/recebimentos em fase posterior, sem misturar
--    com a conta interna do aluno como regra principal.
--
-- 3. Despesas do evento:
--    deverão integrar com contas_pagar e pagamentos reais via API.
--
-- 4. Sessões:
--    são a unidade correta para agenda, ingresso, capacidade e mapa de lugares.
--
-- 5. Subevento:
--    é opcional e só deve ser usado quando houver operação independente.
--
-- 6. Nenhuma automação financeira real foi implementada nesta migration.
--    Apenas estrutura e rastreabilidade.
