begin;
create table if not exists public.financeiro_config (
  id smallint primary key default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dia_fechamento_faturas smallint not null default 1
);
insert into public.financeiro_config (id, dia_fechamento_faturas)
values (1, 1)
on conflict (id) do nothing;
alter table public.financeiro_config
  drop constraint if exists financeiro_config_dia_fechamento_faturas_chk;
alter table public.financeiro_config
  add constraint financeiro_config_dia_fechamento_faturas_chk
  check (dia_fechamento_faturas >= 1 and dia_fechamento_faturas <= 28);
comment on table public.financeiro_config is
  'Configuracoes globais do modulo financeiro.';
comment on column public.financeiro_config.dia_fechamento_faturas is
  'Dia do mes (1..28) para iniciar fechamento automatico de faturas. Padrao: 1.';
drop trigger if exists trg_financeiro_config_updated_at on public.financeiro_config;
create trigger trg_financeiro_config_updated_at
before update on public.financeiro_config
for each row execute function public.set_updated_at();
-- Compatibilidade: permitir status FECHADA em faturas de Credito Conexao.
alter table public.credito_conexao_faturas
  drop constraint if exists credito_conexao_faturas_status_chk;
alter table public.credito_conexao_faturas
  add constraint credito_conexao_faturas_status_chk
  check (status in ('ABERTA', 'FECHADA', 'PAGA', 'EM_ATRASO', 'CANCELADA'));
commit;
