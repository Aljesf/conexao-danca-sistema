begin;

-- Configuracao de provedor de cobranca (SaaS-ready).
-- Neofin e o provedor atual, mas deve permanecer plugavel.
create table if not exists public.financeiro_config_cobranca (
  id bigserial primary key,
  unidade_id bigint null,
  provider_ativo text not null default 'NEOFIN',
  dias_permitidos_vencimento integer[] not null default array[12],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financeiro_config_cobranca_dias_chk check (
    cardinality(dias_permitidos_vencimento) >= 1
    and dias_permitidos_vencimento <@ array[
      1,2,3,4,5,6,7,8,9,10,11,12,13,14,
      15,16,17,18,19,20,21,22,23,24,25,26,27,28
    ]::integer[]
  )
);

create unique index if not exists financeiro_config_cobranca_unidade_uniq
  on public.financeiro_config_cobranca ((coalesce(unidade_id, 0)));

comment on table public.financeiro_config_cobranca is
  'Configuracao do provedor de cobranca. Neofin e o atual, mas deve ser plugavel para SaaS.';

comment on column public.financeiro_config_cobranca.provider_ativo is
  'Provedor ativo de cobranca (ex.: NEOFIN).';

comment on column public.financeiro_config_cobranca.dias_permitidos_vencimento is
  'Lista de dias permitidos para vencimento (1..28). Ex.: {5,10,12,15}.';

insert into public.financeiro_config_cobranca (unidade_id, provider_ativo, dias_permitidos_vencimento)
values (null, 'NEOFIN', array[12])
on conflict ((coalesce(unidade_id, 0))) do nothing;

drop trigger if exists trg_financeiro_config_cobranca_updated_at on public.financeiro_config_cobranca;
create trigger trg_financeiro_config_cobranca_updated_at
before update on public.financeiro_config_cobranca
for each row execute function public.set_updated_at();

-- Preferencia de vencimento na conta (1..28).
alter table public.credito_conexao_contas
  add column if not exists dia_vencimento_preferido integer not null default 12;

update public.credito_conexao_contas
set dia_vencimento_preferido = greatest(1, least(28, coalesce(dia_vencimento, dia_vencimento_preferido, 12)));

alter table public.credito_conexao_contas
  drop constraint if exists credito_conexao_contas_dia_vencimento_preferido_chk;

alter table public.credito_conexao_contas
  add constraint credito_conexao_contas_dia_vencimento_preferido_chk
  check (dia_vencimento_preferido between 1 and 28);

comment on column public.credito_conexao_contas.dia_vencimento_preferido is
  'Dia preferido de vencimento para cobranca do Cartao Conexao. Limitado a 1..28. Regra: ultimo vencimento do exercicio e 12/12 (forcado no calculo).';

commit;
