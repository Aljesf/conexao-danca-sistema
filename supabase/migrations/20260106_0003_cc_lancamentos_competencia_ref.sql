-- =========================================
-- Credito Conexao: competencia + referencia do item (idempotencia mensal)
-- =========================================

alter table public.credito_conexao_lancamentos
  add column if not exists competencia text null,
  add column if not exists referencia_item text null;

create index if not exists idx_cc_lanc_competencia
  on public.credito_conexao_lancamentos(conta_conexao_id, competencia);

create index if not exists idx_cc_lanc_referencia_item
  on public.credito_conexao_lancamentos(referencia_item);

-- Evita duplicar o mesmo item na mesma competencia, quando ambos existirem.
-- (Se competencia/referencia_item forem NULL, o indice nao impede inserts.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cc_lanc_unique_item_comp'
  ) then
    alter table public.credito_conexao_lancamentos
      add constraint cc_lanc_unique_item_comp
      unique (conta_conexao_id, competencia, referencia_item);
  end if;
end $$;
