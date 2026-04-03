-- Tabela de log de webhooks recebidos da Neofim.
-- Registra cada chamada para auditoria e debug.

create table if not exists public.neofim_webhook_log (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  event_type text,
  billing_id text,
  payload jsonb not null default '{}'::jsonb,
  signature text,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.neofim_webhook_log is
  'Log de webhooks recebidos da Neofim para auditoria e reprocessamento.';

create index if not exists ix_neofim_webhook_log_billing_id
  on public.neofim_webhook_log (billing_id)
  where billing_id is not null;

create index if not exists ix_neofim_webhook_log_processed
  on public.neofim_webhook_log (processed)
  where processed = false;
