begin;

-- Tabela de auditoria para alteracoes de cobranca avulsa
create table if not exists public.financeiro_cobrancas_avulsas_auditoria (
  id bigserial primary key,
  cobranca_avulsa_id bigint not null references public.financeiro_cobrancas_avulsas(id) on delete cascade,
  campo text not null,
  valor_anterior text null,
  valor_novo text null,
  motivo text not null,
  criado_em timestamptz not null default now(),
  criado_por text null
);

create index if not exists idx_caa_auditoria_cobranca
  on public.financeiro_cobrancas_avulsas_auditoria (cobranca_avulsa_id, criado_em desc);

commit;
