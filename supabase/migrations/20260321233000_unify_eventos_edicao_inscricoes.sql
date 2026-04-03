begin;

do $$
begin
  create type public.eventos_escola_origem_inscricao_enum as enum (
    'INSCRICAO_INTERNA',
    'INSCRICAO_EXTERNA'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.eventos_escola_destino_financeiro_enum as enum (
    'CONTA_INTERNA',
    'COBRANCA_DIRETA',
    'COBRANCA_AVULSA'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.eventos_escola_inscricao_item_tipo_enum as enum (
    'EVENTO_GERAL',
    'ITEM_EDICAO',
    'COREOGRAFIA'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.eventos_escola_participantes_externos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id bigint not null references public.pessoas(id),
  responsavel_nome text null,
  observacoes text null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists eventos_escola_participantes_externos_pessoa_uidx
  on public.eventos_escola_participantes_externos (pessoa_id);

create index if not exists eventos_escola_participantes_externos_ativo_idx
  on public.eventos_escola_participantes_externos (ativo, created_at desc);

alter table public.eventos_escola_edicao_configuracoes
  add column if not exists permite_pagamento_no_ato boolean not null default true,
  add column if not exists permite_conta_interna boolean not null default true,
  add column if not exists exige_inscricao_geral boolean not null default true,
  add column if not exists permite_inscricao_por_coreografia boolean not null default true,
  add column if not exists permite_vincular_coreografia_depois boolean not null default true;

alter table public.eventos_escola_inscricoes
  add column if not exists origem_inscricao public.eventos_escola_origem_inscricao_enum,
  add column if not exists participante_externo_id uuid null references public.eventos_escola_participantes_externos(id),
  add column if not exists destino_financeiro public.eventos_escola_destino_financeiro_enum,
  add column if not exists gerar_em_conta_interna boolean not null default false,
  add column if not exists pagamento_no_ato boolean not null default false,
  add column if not exists valor_total_centavos integer not null default 0,
  add column if not exists cobranca_id bigint null references public.cobrancas(id),
  add column if not exists cobranca_avulsa_id bigint null references public.financeiro_cobrancas_avulsas(id),
  add column if not exists recebimento_id bigint null references public.recebimentos(id),
  add column if not exists lancamento_conta_interna_id bigint null references public.credito_conexao_lancamentos(id),
  add column if not exists fatura_conta_interna_id bigint null references public.credito_conexao_faturas(id),
  add column if not exists forma_pagamento_codigo text null;

update public.eventos_escola_inscricoes
set
  origem_inscricao = coalesce(origem_inscricao, 'INSCRICAO_INTERNA'::public.eventos_escola_origem_inscricao_enum),
  destino_financeiro = coalesce(
    destino_financeiro,
    case
      when conta_interna_id is not null then 'CONTA_INTERNA'::public.eventos_escola_destino_financeiro_enum
      else 'COBRANCA_DIRETA'::public.eventos_escola_destino_financeiro_enum
    end
  ),
  gerar_em_conta_interna = coalesce(gerar_em_conta_interna, conta_interna_id is not null),
  pagamento_no_ato = coalesce(pagamento_no_ato, false),
  valor_total_centavos = coalesce(
    nullif(valor_total_centavos, 0),
    (
      select coalesce(sum(item.valor_total_centavos), 0)
      from public.eventos_escola_inscricao_itens item
      where item.inscricao_id = public.eventos_escola_inscricoes.id
    ),
    0
  )
where
  origem_inscricao is null
  or destino_financeiro is null
  or valor_total_centavos = 0;

alter table public.eventos_escola_inscricoes
  alter column origem_inscricao set default 'INSCRICAO_INTERNA'::public.eventos_escola_origem_inscricao_enum,
  alter column origem_inscricao set not null,
  alter column destino_financeiro set default 'CONTA_INTERNA'::public.eventos_escola_destino_financeiro_enum,
  alter column destino_financeiro set not null;

create index if not exists eventos_escola_inscricoes_origem_idx
  on public.eventos_escola_inscricoes (edicao_id, origem_inscricao, data_inscricao desc);

create index if not exists eventos_escola_inscricoes_participante_externo_idx
  on public.eventos_escola_inscricoes (participante_externo_id);

alter table public.eventos_escola_inscricao_itens
  add column if not exists tipo_item public.eventos_escola_inscricao_item_tipo_enum,
  add column if not exists item_configuracao_id uuid null references public.eventos_escola_edicao_itens_financeiros(id),
  add column if not exists coreografia_vinculo_id uuid null references public.eventos_escola_edicao_coreografias(id),
  add column if not exists descricao_snapshot text null;

update public.eventos_escola_inscricao_itens
set
  tipo_item = coalesce(tipo_item, 'ITEM_EDICAO'::public.eventos_escola_inscricao_item_tipo_enum),
  descricao_snapshot = coalesce(descricao_snapshot, descricao)
where
  tipo_item is null
  or descricao_snapshot is null;

alter table public.eventos_escola_inscricao_itens
  alter column tipo_item set default 'ITEM_EDICAO'::public.eventos_escola_inscricao_item_tipo_enum,
  alter column tipo_item set not null;

create index if not exists eventos_escola_inscricao_itens_tipo_idx
  on public.eventos_escola_inscricao_itens (inscricao_id, tipo_item);

create index if not exists eventos_escola_inscricao_itens_coreografia_idx
  on public.eventos_escola_inscricao_itens (coreografia_vinculo_id);

comment on table public.eventos_escola_participantes_externos is
  'Participantes externos reutilizaveis para inscricoes de eventos da escola, sempre associados a um cadastro de pessoa e sem promover automaticamente o vinculo academico.';

comment on column public.eventos_escola_inscricoes.origem_inscricao is
  'Origem operacional da inscricao da edicao: interna para aluno da escola ou externa para participante avulso.';

comment on column public.eventos_escola_inscricoes.destino_financeiro is
  'Destino financeiro concreto da inscricao: conta interna, cobranca direta quitada no ato ou cobranca avulsa para participante externo.';

comment on column public.eventos_escola_inscricao_itens.tipo_item is
  'Discriminador da composicao da inscricao: evento geral, item configuravel da edicao ou coreografia vinculada.';

commit;
