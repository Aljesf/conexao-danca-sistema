-- =========================================
-- Credito Conexao - Lancamento consolidado com composicao informativa (snapshot)
-- =========================================

alter table public.credito_conexao_lancamentos
  add column if not exists composicao_json jsonb null;

create index if not exists idx_cc_lanc_composicao_json
  on public.credito_conexao_lancamentos using gin (composicao_json);
