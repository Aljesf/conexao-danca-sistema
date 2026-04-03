alter table public.suporte_tickets
add column if not exists analise_ia_solicitada boolean not null default false,
add column if not exists analise_ia_status text not null default 'nao_solicitada',
add column if not exists analise_ia_modo text null,
add column if not exists analise_ia_md text null,
add column if not exists analise_ia_solicitada_em timestamptz null,
add column if not exists analise_ia_solicitada_por uuid null,
add column if not exists analise_ia_concluida_em timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'suporte_tickets_analise_ia_status_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_analise_ia_status_check
      check (analise_ia_status in ('nao_solicitada', 'solicitada', 'processando', 'concluida', 'falhou'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'suporte_tickets_analise_ia_modo_check'
      and conrelid = 'public.suporte_tickets'::regclass
  ) then
    alter table public.suporte_tickets
      add constraint suporte_tickets_analise_ia_modo_check
      check (analise_ia_modo is null or analise_ia_modo in ('contextual', 'aprofundada'));
  end if;
end $$;

update public.suporte_tickets
set
  analise_ia_md = coalesce(analise_ia_md, analise_ia_texto),
  analise_ia_solicitada = true,
  analise_ia_status = 'concluida',
  analise_ia_modo = coalesce(analise_ia_modo, 'contextual'),
  analise_ia_solicitada_em = coalesce(analise_ia_solicitada_em, created_at),
  analise_ia_solicitada_por = coalesce(analise_ia_solicitada_por, reported_by),
  analise_ia_concluida_em = coalesce(analise_ia_concluida_em, updated_at)
where (
  analise_ia_json is not null
  or nullif(btrim(coalesce(analise_ia_texto, '')), '') is not null
  or nullif(btrim(coalesce(analise_ia_md, '')), '') is not null
)
and analise_ia_status = 'nao_solicitada';

comment on column public.suporte_tickets.analise_ia_solicitada is
  'Indica se o usuario solicitou analise de IA para o ticket.';

comment on column public.suporte_tickets.analise_ia_status is
  'Status da analise de IA do ticket: nao_solicitada, solicitada, processando, concluida, falhou.';

comment on column public.suporte_tickets.analise_ia_modo is
  'Modo solicitado para a analise: contextual ou aprofundada.';

comment on column public.suporte_tickets.analise_ia_md is
  'Saida principal humana da analise de IA em markdown.';

comment on column public.suporte_tickets.analise_ia_solicitada_em is
  'Momento em que a solicitacao de analise de IA foi registrada.';

comment on column public.suporte_tickets.analise_ia_solicitada_por is
  'Usuario que solicitou a analise de IA do ticket.';

comment on column public.suporte_tickets.analise_ia_concluida_em is
  'Momento em que a analise de IA foi concluida com sucesso.';

