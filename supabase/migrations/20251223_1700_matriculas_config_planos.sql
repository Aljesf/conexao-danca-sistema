-- =====================================================================================
-- Matriculas v1 - Configuracoes + Planos (Anuidade) + Preco por Turma + Parcelas em Cobrancas
-- Data: 2025-12-23
-- Observacao: FKs em matricula_precos_turma ficam para migration posterior
-- =====================================================================================

begin;

-- 1) Configuracao global do modulo de matriculas
create table if not exists public.matricula_configuracoes (
  id bigint generated always as identity primary key,
  ativo boolean not null default true,

  vencimento_dia_padrao smallint not null default 4 check (vencimento_dia_padrao between 1 and 28),
  mes_referencia_dias smallint not null default 30 check (mes_referencia_dias = 30),
  parcelas_padrao smallint not null default 12 check (parcelas_padrao between 1 and 24),

  moeda text not null default 'BRL',
  arredondamento_centavos text not null default 'ARREDONDA_NO_FINAL',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create unique index if not exists matricula_configuracoes_ativo_uniq
on public.matricula_configuracoes (ativo)
where ativo = true;

insert into public.matricula_configuracoes (
  ativo, vencimento_dia_padrao, mes_referencia_dias, parcelas_padrao, moeda
)
select true, 4, 30, 12, 'BRL'
where not exists (
  select 1 from public.matricula_configuracoes where ativo = true
);

-- 2) Planos de matricula (ANUIDADE)
create table if not exists public.matricula_planos (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,

  valor_mensal_base_centavos integer not null check (valor_mensal_base_centavos > 0),
  total_parcelas smallint not null default 12 check (total_parcelas between 1 and 24),
  valor_anuidade_centavos integer not null check (valor_anuidade_centavos > 0),

  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists matricula_planos_ativo_idx
on public.matricula_planos (ativo);

-- 3) Tabela de precos por turma e ano (ADMIN)
create table if not exists public.matricula_precos_turma (
  id bigint generated always as identity primary key,

  turma_id bigint not null,
  ano_referencia integer not null,
  plano_id bigint not null,
  centro_custo_id integer,

  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create unique index if not exists matricula_precos_turma_uniq
on public.matricula_precos_turma (turma_id, ano_referencia)
where ativo = true;

create index if not exists matricula_precos_turma_lookup_idx
on public.matricula_precos_turma (ano_referencia, turma_id, ativo);

create index if not exists matricula_precos_turma_plano_idx
on public.matricula_precos_turma (plano_id);

-- 4) Ajustes em cobrancas para parcelamento e prorata
alter table public.cobrancas
  add column if not exists parcela_numero smallint,
  add column if not exists total_parcelas smallint,
  add column if not exists origem_subtipo text, -- 'ANUIDADE_PARCELA' | 'PRORATA_AJUSTE' | etc.
  add column if not exists competencia_ano_mes text; -- 'YYYY-MM'

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cobrancas_parcela_chk'
      and conrelid = 'public.cobrancas'::regclass
  ) then
    alter table public.cobrancas
      add constraint cobrancas_parcela_chk
      check (
        (parcela_numero is null and total_parcelas is null)
        or
        (
          parcela_numero is not null
          and total_parcelas is not null
          and parcela_numero >= 0
          and total_parcelas >= 1
          and parcela_numero <= total_parcelas
        )
      );
  end if;
end
$$;

create index if not exists cobrancas_origem_idx
on public.cobrancas (origem_tipo, origem_id);

create index if not exists cobrancas_parcelas_idx
on public.cobrancas (origem_tipo, origem_id, total_parcelas, parcela_numero);

commit;

-- =====================================================================================
-- Fim da migration
-- =====================================================================================
