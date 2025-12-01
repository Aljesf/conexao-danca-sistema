-- Criacao da tabela de auditoria alinhada com schema atual
create table if not exists public.auditoria_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(user_id),
  acao text not null,
  entidade text not null,
  entidade_id text,
  detalhes jsonb,
  ip text,
  user_agent text
);

-- Indice basico para consultas por data
create index if not exists auditoria_logs_created_at_idx
  on public.auditoria_logs (created_at desc);
