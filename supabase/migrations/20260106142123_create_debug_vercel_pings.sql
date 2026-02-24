-- Debug: pings de escrita vindos do Vercel
create table if not exists public.debug_vercel_pings (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null,
  payload jsonb null
);
-- RLS ON (mantem seguro)
alter table public.debug_vercel_pings enable row level security;
-- Nenhuma policy publica: escrita sera via Service Role (API server-side);
