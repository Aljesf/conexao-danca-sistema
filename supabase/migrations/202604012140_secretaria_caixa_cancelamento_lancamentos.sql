alter table public.credito_conexao_lancamentos
  add column if not exists cancelado_em timestamptz null,
  add column if not exists cancelado_por_user_id uuid null references public.profiles(user_id),
  add column if not exists motivo_cancelamento text null;

create index if not exists idx_credito_conexao_lancamentos_cancelado_em
  on public.credito_conexao_lancamentos (cancelado_em desc)
  where cancelado_em is not null;

comment on column public.credito_conexao_lancamentos.cancelado_em is
  'Timestamp do cancelamento logico operacional no Caixa da Secretaria.';

comment on column public.credito_conexao_lancamentos.cancelado_por_user_id is
  'Usuario (profiles.user_id) que executou o cancelamento operacional do lancamento.';

comment on column public.credito_conexao_lancamentos.motivo_cancelamento is
  'Motivo obrigatorio informado pelo operador ao cancelar um lancamento da conta interna.';
