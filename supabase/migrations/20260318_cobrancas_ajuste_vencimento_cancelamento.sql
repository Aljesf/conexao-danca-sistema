begin;

alter table public.cobrancas
  add column if not exists vencimento_original date;

alter table public.cobrancas
  add column if not exists vencimento_ajustado_em timestamptz;

alter table public.cobrancas
  add column if not exists vencimento_ajustado_por uuid;

alter table public.cobrancas
  add column if not exists vencimento_ajuste_motivo text;

alter table public.cobrancas
  add column if not exists cancelada_em timestamptz;

alter table public.cobrancas
  add column if not exists cancelada_por uuid;

alter table public.cobrancas
  add column if not exists cancelamento_motivo text;

alter table public.cobrancas
  add column if not exists cancelamento_tipo text;

comment on column public.cobrancas.vencimento_original is
  'Primeiro vencimento conhecido da cobranca; preenchido apenas na primeira alteracao manual.';

comment on column public.cobrancas.vencimento_ajustado_em is
  'Timestamp da ultima alteracao manual de vencimento.';

comment on column public.cobrancas.vencimento_ajustado_por is
  'Usuario que executou a ultima alteracao manual de vencimento.';

comment on column public.cobrancas.vencimento_ajuste_motivo is
  'Motivo operacional da ultima alteracao manual de vencimento.';

comment on column public.cobrancas.cancelada_por is
  'Alias novo para o usuario que cancelou a cobranca; legado cancelada_por_user_id permanece preservado.';

comment on column public.cobrancas.cancelamento_motivo is
  'Alias novo para o motivo de cancelamento; legado cancelada_motivo permanece preservado.';

comment on column public.cobrancas.cancelamento_tipo is
  'CANCELAMENTO_OPERACIONAL, CANCELAMENTO_POR_MATRICULA_CANCELADA, CANCELAMENTO_POR_AJUSTE_SISTEMA, OUTRO.';

create table if not exists public.cobrancas_historico_eventos (
  id bigserial primary key,
  cobranca_id bigint not null references public.cobrancas(id) on delete restrict,
  tipo_evento text not null,
  payload_anterior jsonb,
  payload_novo jsonb,
  observacao text,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create index if not exists idx_cobrancas_hist_eventos_cobranca_id
  on public.cobrancas_historico_eventos (cobranca_id);

create index if not exists idx_cobrancas_hist_eventos_tipo_evento
  on public.cobrancas_historico_eventos (tipo_evento);

create index if not exists idx_cobrancas_hist_eventos_created_at_desc
  on public.cobrancas_historico_eventos (created_at desc);

commit;
