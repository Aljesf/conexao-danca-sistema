-- =========================================================
-- MATRÍCULAS: Ledger canônico de linhas financeiras
-- =========================================================

create table if not exists public.matriculas_financeiro_linhas (
  id bigserial primary key,
  matricula_id bigint not null references public.matriculas(id) on delete cascade,

  -- classificador
  tipo text not null, -- ENTRADA | PARCELA | LANCAMENTO_CREDITO | OUTRO
  descricao text not null default '',

  -- valores e datas
  valor_centavos int not null default 0,
  vencimento date null,
  data_evento date null,
  status text not null default 'PENDENTE',

  -- rastreabilidade da origem
  origem_tabela text null,
  origem_id bigint null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matriculas_financeiro_linhas_matricula_idx
  on public.matriculas_financeiro_linhas(matricula_id);

create index if not exists matriculas_financeiro_linhas_tipo_idx
  on public.matriculas_financeiro_linhas(matricula_id, tipo);
