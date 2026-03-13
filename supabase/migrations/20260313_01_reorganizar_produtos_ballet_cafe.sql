begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cafe_produtos'
  ) then
    raise exception 'Tabela public.cafe_produtos nao encontrada.';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cafe_categorias'
  ) then
    raise exception 'Tabela public.cafe_categorias nao encontrada.';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cafe_subcategorias'
  ) then
    raise exception 'Tabela public.cafe_subcategorias nao encontrada.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cafe_produtos'
      and column_name = 'categoria_id'
  ) then
    raise exception 'Coluna public.cafe_produtos.categoria_id nao encontrada.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cafe_produtos'
      and column_name = 'subcategoria_id'
  ) then
    raise exception 'Coluna public.cafe_produtos.subcategoria_id nao encontrada.';
  end if;
end $$;

create temporary table tmp_cafe_categoria_canonica (
  nome text not null,
  slug text not null,
  ordem integer not null
) on commit drop;

insert into tmp_cafe_categoria_canonica (nome, slug, ordem)
values
  ('BEBIDAS', 'bebidas', 10),
  ('SALGADOS', 'salgados', 20),
  ('DOCES', 'doces', 30),
  ('OUTROS', 'outros', 40);

create temporary table tmp_cafe_subcategoria_canonica (
  categoria_slug text not null,
  nome text not null,
  slug text not null,
  ordem integer not null
) on commit drop;

insert into tmp_cafe_subcategoria_canonica (categoria_slug, nome, slug, ordem)
values
  ('bebidas', U&'Caf\00E9', 'cafe', 10),
  ('bebidas', 'Chocolate', 'chocolate', 20),
  ('bebidas', 'Sucos', 'sucos', 30),
  ('bebidas', 'Refrigerantes', 'refrigerantes', 40),
  ('bebidas', U&'\00C1gua', 'agua', 50),
  ('salgados', U&'P\00E3es', 'paes', 10),
  ('salgados', 'Tapiocas', 'tapiocas', 20),
  ('salgados', 'Lanches Quentes', 'lanches-quentes', 30),
  ('salgados', 'Complementos', 'complementos', 40),
  ('doces', 'Bolos', 'bolos', 10),
  ('doces', 'Doces', 'doces', 20),
  ('outros', 'Frutas', 'frutas', 10),
  ('outros', 'Snacks', 'snacks', 20);

create temporary table tmp_cafe_produto_reorg (
  match_key text primary key,
  nome_final text not null,
  categoria_slug text not null,
  subcategoria_slug text not null,
  preparado boolean not null
) on commit drop;

insert into tmp_cafe_produto_reorg (
  match_key,
  nome_final,
  categoria_slug,
  subcategoria_slug,
  preparado
)
values
  ('cafe preto', U&'Caf\00E9 Preto', 'bebidas', 'cafe', false),
  ('cafe com leite', U&'Caf\00E9 com Leite', 'bebidas', 'cafe', false),
  ('queijo quente', 'Queijo Quente', 'salgados', 'lanches-quentes', true),
  ('misto quente', 'Misto Quente', 'salgados', 'lanches-quentes', true),
  ('pao com manteiga', U&'P\00E3o com Manteiga', 'salgados', 'paes', true),
  ('pao com ovo', U&'P\00E3o com Ovo', 'salgados', 'paes', true),
  ('pao com queijo presunto e ovo', U&'P\00E3o com Queijo, Presunto e Ovo', 'salgados', 'paes', true),
  ('tapioca simples', 'Tapioca Simples', 'salgados', 'tapiocas', true),
  ('tapioca com manteiga', 'Tapioca com Manteiga', 'salgados', 'tapiocas', true),
  ('tapioca com ovo', 'Tapioca com Ovo', 'salgados', 'tapiocas', true),
  ('tapioca com queijo', 'Tapioca com Queijo', 'salgados', 'tapiocas', true),
  ('tapioca com queijo e ovo', 'Tapioca com Queijo e Ovo', 'salgados', 'tapiocas', true),
  ('tapioca com queijo ovo e presunto', 'Tapioca com Queijo, Ovo e Presunto', 'salgados', 'tapiocas', true),
  ('chocolate quente', 'Chocolate Quente', 'bebidas', 'chocolate', true),
  ('chocolate gelado', 'Chocolate Gelado', 'bebidas', 'chocolate', false),
  ('suco de maracuja', U&'Suco de Maracuj\00E1', 'bebidas', 'sucos', false),
  ('suco de acerola', 'Suco de Acerola', 'bebidas', 'sucos', false),
  ('suco de cupuacu', U&'Suco de Cupua\00E7u', 'bebidas', 'sucos', false),
  ('suco de laranja', 'Suco de Laranja', 'bebidas', 'sucos', false),
  ('suco de maracuja c leite', U&'Suco de Maracuj\00E1 com Leite', 'bebidas', 'sucos', false),
  ('bolo de chocolate fatia', 'Bolo de Chocolate (Fatia)', 'doces', 'bolos', false),
  ('ovos fritos', 'Ovos Fritos', 'salgados', 'complementos', true),
  ('refrigerante em lata', 'Refrigerante em Lata', 'bebidas', 'refrigerantes', false),
  ('mini pizza', 'Mini Pizza', 'salgados', 'lanches-quentes', true),
  ('pipoca', 'Pipoca', 'outros', 'snacks', false),
  ('hot dog', 'Hot Dog', 'salgados', 'lanches-quentes', true),
  ('docinhos bolo', 'Docinhos + Bolo', 'doces', 'doces', false),
  ('fini variados', 'Fini Variados', 'doces', 'doces', false),
  ('agua', U&'\00C1gua', 'bebidas', 'agua', false),
  ('salgados', 'Salgados', 'salgados', 'lanches-quentes', false),
  ('frutas', 'Frutas', 'outros', 'frutas', false);

create temporary table tmp_cafe_produto_alias (
  match_alias text primary key,
  match_key text not null references tmp_cafe_produto_reorg(match_key)
) on commit drop;

insert into tmp_cafe_produto_alias (match_alias, match_key)
values
  ('cafe preto', 'cafe preto'),
  ('cafe com leite', 'cafe com leite'),
  ('queijo quente', 'queijo quente'),
  ('misto quente', 'misto quente'),
  ('pao com manteiga', 'pao com manteiga'),
  ('pao com ovo', 'pao com ovo'),
  ('pao com queijo presunto e ovo', 'pao com queijo presunto e ovo'),
  ('tapioca simples', 'tapioca simples'),
  ('tapioca com manteiga', 'tapioca com manteiga'),
  ('tapioca com ovo', 'tapioca com ovo'),
  ('tapioca com queijo', 'tapioca com queijo'),
  ('tapioca com queijo e ovo', 'tapioca com queijo e ovo'),
  ('tapioca com queijo ovo e presunto', 'tapioca com queijo ovo e presunto'),
  ('chocolate quente', 'chocolate quente'),
  ('chocolate gelado', 'chocolate gelado'),
  ('suco de maracuja', 'suco de maracuja'),
  ('suco de acerola', 'suco de acerola'),
  ('suco de cupuacu', 'suco de cupuacu'),
  ('suco de laranja', 'suco de laranja'),
  ('suco de maracuja com leite', 'suco de maracuja c leite'),
  ('bolo de chocolate fatia', 'bolo de chocolate fatia'),
  ('ovos fritos', 'ovos fritos'),
  ('refrigerante em lata', 'refrigerante em lata'),
  ('mini pizza', 'mini pizza'),
  ('pipoca', 'pipoca'),
  ('hot dog', 'hot dog'),
  ('docinhos bolo', 'docinhos bolo'),
  ('fini variados', 'fini variados'),
  ('agua', 'agua'),
  ('salgados', 'salgados'),
  ('frutas', 'frutas');

insert into public.cafe_categorias (centro_custo_id, nome, slug, ordem, ativo)
select
  null as centro_custo_id,
  c.nome,
  c.slug,
  c.ordem,
  true as ativo
from tmp_cafe_categoria_canonica c
on conflict ((coalesce(centro_custo_id, 0)), slug) do update
set
  nome = excluded.nome,
  ordem = excluded.ordem,
  ativo = excluded.ativo;

insert into public.cafe_subcategorias (categoria_id, nome, slug, ordem, ativo)
select
  cat.id as categoria_id,
  sub.nome,
  sub.slug,
  sub.ordem,
  true as ativo
from tmp_cafe_subcategoria_canonica sub
join public.cafe_categorias cat
  on coalesce(cat.centro_custo_id, 0) = 0
 and cat.slug = sub.categoria_slug
on conflict (categoria_id, slug) do update
set
  nome = excluded.nome,
  ordem = excluded.ordem,
  ativo = excluded.ativo;

do $$
declare
  v_mapeados integer;
  v_colisoes integer;
begin
  select count(*)
    into v_mapeados
  from public.cafe_produtos p
  join tmp_cafe_produto_alias a
    on trim(regexp_replace(
      translate(
        lower(trim(coalesce(p.nome, ''))),
        U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7',
        'aaaaaeeeeiiiiooooouuuuc'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )) = a.match_alias
  join tmp_cafe_produto_reorg m
    on m.match_key = a.match_key;

  if v_mapeados <> 31 then
    raise exception 'Esperado mapear 31 produtos do Ballet Café, mas foram encontrados %.', v_mapeados;
  end if;

  select count(*)
    into v_colisoes
  from (
    select m.nome_final
    from public.cafe_produtos p
    join tmp_cafe_produto_alias a
      on trim(regexp_replace(
        translate(
          lower(trim(coalesce(p.nome, ''))),
          U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7',
          'aaaaaeeeeiiiiooooouuuuc'
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      )) = a.match_alias
    join tmp_cafe_produto_reorg m
      on m.match_key = a.match_key
    group by m.nome_final
    having count(*) > 1
  ) duplicados;

  if v_colisoes > 0 then
    raise exception 'A reorganizacao de produtos geraria colisao no unique por nome.';
  end if;
end $$;

with produtos_mapeados as (
  select
    p.id,
    m.nome_final,
    cat.id as categoria_id,
    cat.nome as categoria_nome_legacy,
    sub.id as subcategoria_id,
    m.preparado
  from public.cafe_produtos p
  join tmp_cafe_produto_alias a
    on trim(regexp_replace(
      translate(
        lower(trim(coalesce(p.nome, ''))),
        U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7',
        'aaaaaeeeeiiiiooooouuuuc'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )) = a.match_alias
  join tmp_cafe_produto_reorg m
    on m.match_key = a.match_key
  join public.cafe_categorias cat
    on coalesce(cat.centro_custo_id, 0) = 0
   and cat.slug = m.categoria_slug
  join public.cafe_subcategorias sub
    on sub.categoria_id = cat.id
   and sub.slug = m.subcategoria_slug
)
update public.cafe_produtos p
set
  nome = pm.nome_final,
  categoria = pm.categoria_nome_legacy,
  categoria_id = pm.categoria_id,
  subcategoria_id = pm.subcategoria_id,
  preparado = pm.preparado
from produtos_mapeados pm
where p.id = pm.id
  and (
    p.nome is distinct from pm.nome_final
    or p.categoria is distinct from pm.categoria_nome_legacy
    or p.categoria_id is distinct from pm.categoria_id
    or p.subcategoria_id is distinct from pm.subcategoria_id
    or p.preparado is distinct from pm.preparado
  );

update public.cafe_subcategorias sub
set ativo = false
where not exists (
  select 1
  from tmp_cafe_subcategoria_canonica canon
  join public.cafe_categorias cat
    on coalesce(cat.centro_custo_id, 0) = 0
   and cat.slug = canon.categoria_slug
  where cat.id = sub.categoria_id
    and canon.slug = sub.slug
)
and not exists (
  select 1
  from public.cafe_produtos prod
  where prod.subcategoria_id = sub.id
);

update public.cafe_categorias cat
set ativo = false
where coalesce(cat.centro_custo_id, 0) = 0
  and cat.slug not in (select slug from tmp_cafe_categoria_canonica)
  and not exists (
    select 1
    from public.cafe_produtos prod
    where prod.categoria_id = cat.id
  );

commit;
