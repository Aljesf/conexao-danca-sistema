-- =========================================
-- Credito Conexao - Configuracoes gerais do ciclo e politica declarativa
-- =========================================

create table if not exists public.credito_conexao_configuracoes (
  id bigserial primary key,
  tipo_conta text not null check (tipo_conta in ('ALUNO','COLABORADOR')),
  dia_fechamento integer not null check (dia_fechamento between 1 and 31),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  tolerancia_dias integer not null default 0 check (tolerancia_dias between 0 and 30),
  multa_percentual numeric not null default 0 check (multa_percentual >= 0),
  juros_dia_percentual numeric not null default 0 check (juros_dia_percentual >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_cc_config_tipo_conta
  on public.credito_conexao_configuracoes(tipo_conta);

-- seed padrao
insert into public.credito_conexao_configuracoes
  (tipo_conta, dia_fechamento, dia_vencimento, tolerancia_dias, multa_percentual, juros_dia_percentual, ativo)
select 'ALUNO', 10, 12, 0, 0, 0, true
where not exists (select 1 from public.credito_conexao_configuracoes where tipo_conta = 'ALUNO');

insert into public.credito_conexao_configuracoes
  (tipo_conta, dia_fechamento, dia_vencimento, tolerancia_dias, multa_percentual, juros_dia_percentual, ativo)
select 'COLABORADOR', 10, 12, 0, 0, 0, true
where not exists (select 1 from public.credito_conexao_configuracoes where tipo_conta = 'COLABORADOR');

-- trigger updated_at especifico
do $$
begin
  if not exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'set_updated_at_credito_conexao_configuracoes'
  ) then
    execute $fn$
      create function public.set_updated_at_credito_conexao_configuracoes()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $fn$;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_cc_config_updated_at') then
    execute $trg$
      create trigger trg_cc_config_updated_at
      before update on public.credito_conexao_configuracoes
      for each row
      execute function public.set_updated_at_credito_conexao_configuracoes();
    $trg$;
  end if;
end $$;
