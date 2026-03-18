begin;

create table if not exists public.auditoria_migracao_conta_interna_cobrancas (
  id bigserial primary key,
  cobranca_id bigint not null references public.cobrancas(id) on delete cascade,
  etapa text not null,
  classificacao_anterior jsonb,
  classificacao_nova jsonb,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditoria_migracao_conta_interna_cobrancas_cobranca
  on public.auditoria_migracao_conta_interna_cobrancas (cobranca_id);

comment on table public.auditoria_migracao_conta_interna_cobrancas is
'Trilha de antes/depois da migração semântica das cobranças para conta interna, sem apagar o vínculo legado.';

commit;
