create table if not exists public.suporte_tickets (
  id bigserial primary key,
  codigo text unique,
  tipo text not null check (tipo in ('ERRO_SISTEMA', 'MELHORIA_SISTEMA')),
  status text not null default 'ABERTO' check (
    status in (
      'ABERTO',
      'EM_TRIAGEM',
      'EM_ANALISE',
      'EM_DESENVOLVIMENTO',
      'AGUARDANDO_VALIDACAO',
      'CONCLUIDO',
      'CANCELADO'
    )
  ),
  prioridade text not null default 'MEDIA' check (prioridade in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),

  titulo text,
  descricao text not null,

  contexto_slug text,
  contexto_nome text,
  rota_path text,
  url_completa text,
  pagina_titulo text,

  origem text not null default 'BOTAO_FLUTUANTE' check (
    origem in ('BOTAO_FLUTUANTE', 'PAINEL_SUPORTE', 'API', 'INTERNO')
  ),
  screenshot_url text,

  dados_contexto_json jsonb not null default '{}'::jsonb,
  dados_tecnicos_json jsonb not null default '{}'::jsonb,

  erro_mensagem text,
  erro_stack text,
  erro_nome text,

  user_agent text,
  viewport_largura integer,
  viewport_altura integer,

  reported_by uuid,
  responsavel_uuid uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_suporte_tickets_tipo on public.suporte_tickets(tipo);
create index if not exists idx_suporte_tickets_status on public.suporte_tickets(status);
create index if not exists idx_suporte_tickets_prioridade on public.suporte_tickets(prioridade);
create index if not exists idx_suporte_tickets_contexto_slug on public.suporte_tickets(contexto_slug);
create index if not exists idx_suporte_tickets_created_at on public.suporte_tickets(created_at desc);

create or replace function public.suporte_tickets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_suporte_tickets_set_updated_at on public.suporte_tickets;
create trigger trg_suporte_tickets_set_updated_at
before update on public.suporte_tickets
for each row
execute function public.suporte_tickets_set_updated_at();

create or replace function public.suporte_tickets_set_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := 'SUP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.suporte_tickets_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_suporte_tickets_set_codigo on public.suporte_tickets;
create trigger trg_suporte_tickets_set_codigo
before insert on public.suporte_tickets
for each row
execute function public.suporte_tickets_set_codigo();
