alter table public.cafe_compras
  add column if not exists status text not null default 'ATIVA',
  add column if not exists cancelada_em timestamptz null,
  add column if not exists cancelada_por uuid null references auth.users(id),
  add column if not exists motivo_cancelamento text null;

create index if not exists idx_cafe_compras_status_data
on public.cafe_compras (status, data_compra desc);
