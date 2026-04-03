create table if not exists public.suporte_ticket_anexos (
  id bigserial primary key,
  ticket_id bigint not null references public.suporte_tickets(id) on delete cascade,
  storage_bucket text not null default 'suporte',
  storage_path text not null,
  public_url text not null,
  nome_arquivo text not null,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes >= 0),
  largura integer check (largura is null or largura >= 0),
  altura integer check (altura is null or altura >= 0),
  origem_upload text not null default 'file_picker' check (
    origem_upload in ('file_picker', 'clipboard', 'drag_drop', 'auto_capture', 'legacy')
  ),
  screen_context_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_suporte_ticket_anexos_ticket_id
  on public.suporte_ticket_anexos(ticket_id, created_at desc);

create unique index if not exists uq_suporte_ticket_anexos_ticket_path
  on public.suporte_ticket_anexos(ticket_id, storage_path);

comment on table public.suporte_ticket_anexos is
  'Anexos de suporte por ticket, com metadados de arquivo e contexto semantico da tela.';

comment on column public.suporte_ticket_anexos.screen_context_json is
  'Contexto legivel da tela no momento do upload para uso humano e por IA.';
