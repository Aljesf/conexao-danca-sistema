alter table public.suporte_tickets
add column if not exists analise_ia_texto text,
add column if not exists analise_ia_json jsonb;

comment on column public.suporte_tickets.analise_ia_texto is
  'Resumo textual da analise automatica de IA para o ticket de suporte.';

comment on column public.suporte_tickets.analise_ia_json is
  'Estrutura completa da analise automatica de IA para o ticket de suporte.';
