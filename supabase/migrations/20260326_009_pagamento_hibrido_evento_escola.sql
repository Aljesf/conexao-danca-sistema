-- Suporte a pagamento hibrido em inscricoes do modulo de eventos da escola.
-- Registra pagamentos feitos no ato e snapshots financeiros da inscricao
-- sem alterar destrutivamente os registros antigos.

begin;

create table if not exists public.eventos_escola_inscricao_pagamentos (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references public.eventos_escola_inscricoes(id) on delete cascade,
  tipo_pagamento text not null check (tipo_pagamento in ('ATO', 'AJUSTE', 'QUITACAO')),
  forma_pagamento_id bigint null references public.formas_pagamento(id) on delete set null,
  valor_centavos integer not null check (valor_centavos >= 0),
  recebimento_id bigint null references public.recebimentos(id) on delete set null,
  movimento_financeiro_id bigint null references public.movimento_financeiro(id) on delete set null,
  observacoes text null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create index if not exists idx_eventos_escola_inscricao_pagamentos_inscricao
  on public.eventos_escola_inscricao_pagamentos (inscricao_id, created_at desc);

comment on table public.eventos_escola_inscricao_pagamentos is
  'Rastreia pagamentos realizados no ato, ajustes e quitacoes das inscricoes de eventos.';

alter table public.eventos_escola_inscricoes
  add column if not exists modalidade_pagamento_financeiro text null,
  add column if not exists valor_pago_ato_centavos integer not null default 0,
  add column if not exists valor_saldo_conta_interna_centavos integer not null default 0;

comment on column public.eventos_escola_inscricoes.modalidade_pagamento_financeiro is
  'Snapshot do modelo financeiro da inscricao: ATO_TOTAL, CONTA_INTERNA_TOTAL ou MISTO.';

alter table public.eventos_escola_inscricoes
  drop constraint if exists eventos_escola_inscricoes_modalidade_pagamento_financeiro_chk;

alter table public.eventos_escola_inscricoes
  add constraint eventos_escola_inscricoes_modalidade_pagamento_financeiro_chk
  check (
    modalidade_pagamento_financeiro is null
    or modalidade_pagamento_financeiro in ('ATO_TOTAL', 'CONTA_INTERNA_TOTAL', 'MISTO')
  );

alter table public.eventos_escola_inscricoes
  drop constraint if exists eventos_escola_inscricoes_valor_pago_ato_centavos_chk;

alter table public.eventos_escola_inscricoes
  add constraint eventos_escola_inscricoes_valor_pago_ato_centavos_chk
  check (valor_pago_ato_centavos >= 0);

alter table public.eventos_escola_inscricoes
  drop constraint if exists eventos_escola_inscricoes_valor_saldo_conta_interna_centavos_chk;

alter table public.eventos_escola_inscricoes
  add constraint eventos_escola_inscricoes_valor_saldo_conta_interna_centavos_chk
  check (valor_saldo_conta_interna_centavos >= 0);

alter table public.eventos_escola_inscricoes
  drop constraint if exists eventos_escola_inscricoes_snapshot_pagamento_hibrido_chk;

alter table public.eventos_escola_inscricoes
  add constraint eventos_escola_inscricoes_snapshot_pagamento_hibrido_chk
  check (
    valor_pago_ato_centavos + valor_saldo_conta_interna_centavos = coalesce(valor_total_centavos, 0)
  );

update public.eventos_escola_inscricoes as inscricao
set
  modalidade_pagamento_financeiro = case
    when coalesce(inscricao.destino_financeiro, 'CONTA_INTERNA') = 'COBRANCA_AVULSA' then 'ATO_TOTAL'
    when inscricao.pagamento_no_ato = true
      and coalesce(inscricao.destino_financeiro, 'COBRANCA_DIRETA') = 'COBRANCA_DIRETA' then 'ATO_TOTAL'
    else 'CONTA_INTERNA_TOTAL'
  end,
  valor_pago_ato_centavos = case
    when coalesce(inscricao.destino_financeiro, 'CONTA_INTERNA') = 'COBRANCA_AVULSA' then coalesce(inscricao.valor_total_centavos, 0)
    when inscricao.pagamento_no_ato = true
      and coalesce(inscricao.destino_financeiro, 'COBRANCA_DIRETA') = 'COBRANCA_DIRETA' then coalesce(inscricao.valor_total_centavos, 0)
    else 0
  end,
  valor_saldo_conta_interna_centavos = case
    when coalesce(inscricao.destino_financeiro, 'CONTA_INTERNA') = 'COBRANCA_AVULSA' then 0
    when inscricao.pagamento_no_ato = true
      and coalesce(inscricao.destino_financeiro, 'COBRANCA_DIRETA') = 'COBRANCA_DIRETA' then 0
    else coalesce(inscricao.valor_total_centavos, 0)
  end
where inscricao.modalidade_pagamento_financeiro is null
   or inscricao.valor_pago_ato_centavos = 0
   or inscricao.valor_saldo_conta_interna_centavos = 0;

commit;
