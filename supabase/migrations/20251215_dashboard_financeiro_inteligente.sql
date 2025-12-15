-- Dashboard Financeiro Inteligente - snapshots e analises GPT

create table if not exists public.financeiro_snapshots (
  id bigserial primary key,
  created_at timestamptz default now(),
  data_base date not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  centro_custo_id bigint null,
  caixa_hoje_centavos bigint not null default 0,
  entradas_previstas_30d_centavos bigint not null default 0,
  saidas_comprometidas_30d_centavos bigint not null default 0,
  folego_caixa_dias numeric null,
  tendencia jsonb not null default '{}'::jsonb,
  resumo_por_centro jsonb not null default '[]'::jsonb,
  serie_fluxo_caixa jsonb not null default '[]'::jsonb,
  regras_alerta jsonb not null default '[]'::jsonb
);

create index if not exists idx_financeiro_snapshots_data_base
  on public.financeiro_snapshots (data_base);

create index if not exists idx_financeiro_snapshots_centro_data
  on public.financeiro_snapshots (centro_custo_id, data_base);

create table if not exists public.financeiro_analises_gpt (
  id bigserial primary key,
  created_at timestamptz default now(),
  snapshot_id bigint references public.financeiro_snapshots(id) on delete cascade,
  model text null,
  alertas jsonb not null default '[]'::jsonb,
  texto_curto text null,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists idx_financeiro_analises_gpt_snapshot
  on public.financeiro_analises_gpt (snapshot_id);

create index if not exists idx_financeiro_analises_gpt_created_at
  on public.financeiro_analises_gpt (created_at);
