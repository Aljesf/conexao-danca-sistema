-- 1) Campos para controle da primeira cobranca (ato da matricula)
alter table public.matriculas
  add column if not exists primeira_cobranca_tipo text,
  add column if not exists primeira_cobranca_status text not null default 'PENDENTE',
  add column if not exists primeira_cobranca_valor_centavos integer,
  add column if not exists primeira_cobranca_cobranca_id bigint,
  add column if not exists primeira_cobranca_recebimento_id bigint,
  add column if not exists primeira_cobranca_forma_pagamento_id bigint,
  add column if not exists primeira_cobranca_data_pagamento date,
  add column if not exists excecao_primeiro_pagamento boolean not null default false,
  add column if not exists motivo_excecao_primeiro_pagamento text,
  add column if not exists excecao_autorizada_por uuid,
  add column if not exists excecao_criada_em timestamptz;

-- 2) Checks simples (sem TYPE enum, para flexibilidade no MVP)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_primeira_cobranca_tipo_chk'
  ) then
    alter table public.matriculas
      add constraint matriculas_primeira_cobranca_tipo_chk
      check (primeira_cobranca_tipo is null or primeira_cobranca_tipo in (
        'ENTRADA_PRORATA',
        'MENSALIDADE_CHEIA_CARTAO'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_primeira_cobranca_status_chk'
  ) then
    alter table public.matriculas
      add constraint matriculas_primeira_cobranca_status_chk
      check (primeira_cobranca_status in (
        'PENDENTE',
        'PAGA',
        'LANCADA_CARTAO',
        'ADIADA_EXCECAO'
      ));
  end if;
end $$;

-- 3) FKs (se as tabelas existirem)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_primeira_cobranca_cobranca_fk'
  ) then
    alter table public.matriculas
      add constraint matriculas_primeira_cobranca_cobranca_fk
      foreign key (primeira_cobranca_cobranca_id) references public.cobrancas(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_primeira_cobranca_recebimento_fk'
  ) then
    alter table public.matriculas
      add constraint matriculas_primeira_cobranca_recebimento_fk
      foreign key (primeira_cobranca_recebimento_id) references public.recebimentos(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'matriculas_primeira_cobranca_forma_pagamento_fk'
  ) then
    alter table public.matriculas
      add constraint matriculas_primeira_cobranca_forma_pagamento_fk
      foreign key (primeira_cobranca_forma_pagamento_id) references public.formas_pagamento(id)
      on delete set null;
  end if;
end $$;

-- 4) Indices
create index if not exists idx_matriculas_primeira_cobranca_status
  on public.matriculas (primeira_cobranca_status);

create index if not exists idx_matriculas_primeira_cobranca_tipo
  on public.matriculas (primeira_cobranca_tipo);

select pg_notify('pgrst', 'reload schema');
