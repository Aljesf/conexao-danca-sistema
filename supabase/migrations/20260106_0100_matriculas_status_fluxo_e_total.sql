-- =========================================
-- Matriculas: fluxo seguro (rascunho -> ativa) e total mensalidade
-- =========================================

alter table public.matriculas
  add column if not exists status_fluxo text not null default 'RASCUNHO'
    check (status_fluxo in ('RASCUNHO','AGUARDANDO_LIQUIDACAO','ATIVA','CANCELADA')),
  add column if not exists total_mensalidade_centavos integer not null default 0,
  add column if not exists concluida_em timestamptz null,
  add column if not exists rascunho_expira_em timestamptz null;

create index if not exists idx_matriculas_status_fluxo
  on public.matriculas(status_fluxo);

create index if not exists idx_matriculas_concluida_em
  on public.matriculas(concluida_em);

-- Backfill: matriculas existentes viram ATIVA (para nao sumir nada antigo)
update public.matriculas
set status_fluxo = 'ATIVA'
where status_fluxo in ('RASCUNHO','AGUARDANDO_LIQUIDACAO')
  and concluida_em is not null;

-- Para registros antigos que nao tinham coluna, marcar como ATIVA
update public.matriculas
set status_fluxo = 'ATIVA'
where concluida_em is not null
  and status_fluxo = 'RASCUNHO';

update public.matriculas
set status_fluxo = 'ATIVA'
where status_fluxo = 'RASCUNHO'
  and concluida_em is null;
