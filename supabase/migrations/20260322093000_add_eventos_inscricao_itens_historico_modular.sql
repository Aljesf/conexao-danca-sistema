begin;

do $$
begin
  create type public.eventos_escola_inscricao_item_origem_enum as enum (
    'INSCRICAO_INICIAL',
    'AMPLIACAO_POSTERIOR'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.eventos_escola_inscricao_itens
  add column if not exists origem_item public.eventos_escola_inscricao_item_origem_enum,
  add column if not exists cancelado_em timestamptz null,
  add column if not exists motivo_cancelamento text null,
  add column if not exists updated_at timestamptz not null default now();

update public.eventos_escola_inscricao_itens
set
  origem_item = coalesce(
    origem_item,
    'INSCRICAO_INICIAL'::public.eventos_escola_inscricao_item_origem_enum
  ),
  updated_at = coalesce(updated_at, created_at, now())
where origem_item is null;

alter table public.eventos_escola_inscricao_itens
  alter column origem_item set default 'INSCRICAO_INICIAL'::public.eventos_escola_inscricao_item_origem_enum,
  alter column origem_item set not null;

create index if not exists eventos_escola_inscricao_itens_status_idx
  on public.eventos_escola_inscricao_itens (inscricao_id, status, created_at desc);

create table if not exists public.eventos_escola_inscricao_item_movimentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references public.eventos_escola_inscricoes(id) on delete cascade,
  inscricao_item_id uuid not null references public.eventos_escola_inscricao_itens(id) on delete cascade,
  tipo_movimento text not null default 'CONSTITUICAO'
    check (tipo_movimento in ('CONSTITUICAO', 'CANCELAMENTO_SEM_ESTORNO', 'AJUSTE_MANUAL')),
  destino_financeiro public.eventos_escola_destino_financeiro_enum not null,
  competencia text null,
  parcela_numero integer null check (parcela_numero is null or parcela_numero > 0),
  total_parcelas integer null check (total_parcelas is null or total_parcelas > 0),
  valor_centavos integer not null default 0 check (valor_centavos >= 0),
  conta_interna_id bigint null references public.credito_conexao_contas(id) on delete set null,
  cobranca_id bigint null references public.cobrancas(id) on delete set null,
  cobranca_avulsa_id bigint null references public.financeiro_cobrancas_avulsas(id) on delete set null,
  recebimento_id bigint null references public.recebimentos(id) on delete set null,
  lancamento_conta_interna_id bigint null references public.credito_conexao_lancamentos(id) on delete set null,
  fatura_conta_interna_id bigint null references public.credito_conexao_faturas(id) on delete set null,
  observacoes text null,
  created_at timestamptz not null default now()
);

create index if not exists eventos_escola_inscricao_item_movimentos_financeiros_inscricao_idx
  on public.eventos_escola_inscricao_item_movimentos_financeiros (inscricao_id, created_at desc);

create index if not exists eventos_escola_inscricao_item_movimentos_financeiros_item_idx
  on public.eventos_escola_inscricao_item_movimentos_financeiros (inscricao_item_id, created_at desc);

create index if not exists eventos_escola_inscricao_item_movimentos_financeiros_competencia_idx
  on public.eventos_escola_inscricao_item_movimentos_financeiros (inscricao_id, competencia);

comment on column public.eventos_escola_inscricao_itens.origem_item is
  'Identifica se o item nasceu na inscricao inicial ou foi adicionado posteriormente como ampliacao da mesma inscricao-mae.';

comment on column public.eventos_escola_inscricao_itens.cancelado_em is
  'Data de cancelamento parcial do item da inscricao, sem apagar historico nem recompor automaticamente o financeiro.';

comment on table public.eventos_escola_inscricao_item_movimentos_financeiros is
  'Trilha financeira modular por item da inscricao da edicao, permitindo rastrear constituicao, ampliacoes posteriores e cancelamentos sem estorno automatico.';

commit;
