begin;

create table if not exists public.cafe_categorias (
  id bigserial primary key,
  centro_custo_id integer null references public.centros_custo(id) on delete set null,
  nome text not null,
  slug text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_cafe_categorias_centro_slug
  on public.cafe_categorias ((coalesce(centro_custo_id, 0)), slug);

create index if not exists idx_cafe_categorias_ativo_ordem
  on public.cafe_categorias (ativo, ordem, nome);

create table if not exists public.cafe_subcategorias (
  id bigserial primary key,
  categoria_id bigint not null references public.cafe_categorias(id) on delete cascade,
  nome text not null,
  slug text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (categoria_id, slug)
);

create index if not exists idx_cafe_subcategorias_cat_ativo_ordem
  on public.cafe_subcategorias (categoria_id, ativo, ordem, nome);

drop trigger if exists trg_cafe_categorias_updated_at on public.cafe_categorias;
create trigger trg_cafe_categorias_updated_at
before update on public.cafe_categorias
for each row execute function public.set_updated_at();

drop trigger if exists trg_cafe_subcategorias_updated_at on public.cafe_subcategorias;
create trigger trg_cafe_subcategorias_updated_at
before update on public.cafe_subcategorias
for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cafe_produtos'
  ) then
    alter table public.cafe_produtos
      add column if not exists categoria_id bigint null references public.cafe_categorias(id) on delete set null;

    alter table public.cafe_produtos
      add column if not exists subcategoria_id bigint null references public.cafe_subcategorias(id) on delete set null;

    create index if not exists idx_cafe_produtos_categoria
      on public.cafe_produtos (categoria_id);

    create index if not exists idx_cafe_produtos_subcategoria
      on public.cafe_produtos (subcategoria_id);
  end if;
end $$;

do $$
declare
  r record;
  v_slug text;
  v_cat_id bigint;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cafe_produtos'
      and column_name = 'categoria'
  ) then
    for r in
      select distinct trim(categoria) as categoria_txt
      from public.cafe_produtos
      where categoria is not null
        and trim(categoria) <> ''
    loop
      v_slug := lower(trim(r.categoria_txt));
      v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
      v_slug := regexp_replace(v_slug, '[^a-z0-9\-]', '', 'g');
      v_slug := regexp_replace(v_slug, '\-+', '-', 'g');
      v_slug := trim(both '-' from v_slug);

      if v_slug = '' then
        v_slug := 'geral';
      end if;

      insert into public.cafe_categorias (centro_custo_id, nome, slug, ordem, ativo)
      values (null, r.categoria_txt, v_slug, 0, true)
      on conflict ((coalesce(centro_custo_id, 0)), slug) do nothing;

      select id
        into v_cat_id
      from public.cafe_categorias
      where coalesce(centro_custo_id, 0) = 0
        and slug = v_slug
      limit 1;

      update public.cafe_produtos
      set categoria_id = v_cat_id
      where categoria_id is null
        and categoria is not null
        and trim(categoria) = r.categoria_txt;
    end loop;
  end if;
end $$;

comment on table public.cafe_categorias is
  'Categorias canonicas do Ballet Cafe.';

comment on table public.cafe_subcategorias is
  'Subcategorias do Ballet Cafe por categoria.';

commit;
