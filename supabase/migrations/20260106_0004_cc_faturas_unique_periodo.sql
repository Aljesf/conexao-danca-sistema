-- =========================================
-- Credito Conexao: garantir unicidade da fatura por conta + periodo_referencia
-- =========================================

create index if not exists idx_cc_faturas_conta_periodo
  on public.credito_conexao_faturas(conta_conexao_id, periodo_referencia);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cc_faturas_unique_conta_periodo'
  ) then
    alter table public.credito_conexao_faturas
      add constraint cc_faturas_unique_conta_periodo
      unique (conta_conexao_id, periodo_referencia);
  end if;
end $$;
