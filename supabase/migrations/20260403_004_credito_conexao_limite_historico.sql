-- A4: Histórico de alterações de limite de crédito

create table if not exists public.credito_conexao_limite_historico (
  id bigint generated always as identity primary key,
  conta_conexao_id bigint not null references public.credito_conexao_contas(id),
  limite_anterior_centavos integer,
  limite_novo_centavos integer not null,
  tipo_limite text not null default 'AUTORIZADO',
  alterado_por text,
  motivo text,
  created_at timestamptz not null default now()
);

comment on table public.credito_conexao_limite_historico is
  'Auditoria de todas as alterações de limite de crédito nas contas internas.';

create index if not exists ix_credito_conexao_limite_historico_conta
  on public.credito_conexao_limite_historico (conta_conexao_id);
