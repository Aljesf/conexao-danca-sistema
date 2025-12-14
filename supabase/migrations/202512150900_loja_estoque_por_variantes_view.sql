-- 1) Colunas variante_id (nullable por enquanto)
alter table public.loja_estoque_movimentos
  add column if not exists variante_id bigint null;

alter table public.loja_pedidos_compra_itens
  add column if not exists variante_id bigint null;

alter table public.loja_venda_itens
  add column if not exists variante_id bigint null;

-- 2) FKs (usar DO $$ para evitar falha se ja existir)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_loja_mov_variante'
  ) then
    alter table public.loja_estoque_movimentos
      add constraint fk_loja_mov_variante
      foreign key (variante_id) references public.loja_produto_variantes(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'fk_loja_compra_item_variante'
  ) then
    alter table public.loja_pedidos_compra_itens
      add constraint fk_loja_compra_item_variante
      foreign key (variante_id) references public.loja_produto_variantes(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'fk_loja_venda_item_variante'
  ) then
    alter table public.loja_venda_itens
      add constraint fk_loja_venda_item_variante
      foreign key (variante_id) references public.loja_produto_variantes(id)
      on delete set null;
  end if;
end$$;

-- 3) Indices
create index if not exists idx_loja_mov_variante_id on public.loja_estoque_movimentos(variante_id);
create index if not exists idx_loja_compra_item_variante_id on public.loja_pedidos_compra_itens(variante_id);
create index if not exists idx_loja_venda_item_variante_id on public.loja_venda_itens(variante_id);

-- 4) View de estoque por produto (soma das variantes)
create or replace view public.v_loja_produtos_estoque as
select
  p.id as produto_id,
  coalesce(sum(v.estoque_atual), 0)::int as estoque_total
from public.loja_produtos p
left join public.loja_produto_variantes v
  on v.produto_id = p.id
  and v.ativo is true
group by p.id;
