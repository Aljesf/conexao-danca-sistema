-- =========================================================
-- MODULO: ESTILOS DE COREOGRAFIA E SANEAMENTO EDITORIAL
-- OBJETIVOS:
-- - substituir estilo livre por cadastro estruturado de estilos
-- - adicionar descricao editorial a edicoes
-- - preservar historico sem renomear automaticamente evento-base e edicao
-- =========================================================

create table if not exists public.coreografia_estilos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null,
  descricao text,
  ativo boolean not null default true,
  ordem_exibicao integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_coreografia_estilos_slug
  on public.coreografia_estilos(slug);

create unique index if not exists idx_coreografia_estilos_nome_lower
  on public.coreografia_estilos(lower(nome));

create index if not exists idx_coreografia_estilos_ativo_ordem
  on public.coreografia_estilos(ativo, ordem_exibicao, nome);

insert into public.coreografia_estilos (nome, slug, descricao, ordem_exibicao)
values
  ('Bale', 'bale', 'Estilo base de bale.', 1),
  ('Bale classico livre', 'bale-classico-livre', 'Coreografias classicas livres.', 2),
  ('Classico de repertorio', 'classico-de-repertorio', 'Trechos e remontagens de repertorio classico.', 3),
  ('Jazz', 'jazz', 'Linguagem de jazz e variacoes contemporaneas.', 4),
  ('Contemporaneo', 'contemporaneo', 'Pesquisa corporal e criacao contemporanea.', 5),
  ('Sapateado', 'sapateado', 'Sapateado e suas derivacoes.', 6),
  ('Dancas urbanas', 'dancas-urbanas', 'Hip hop, breaking e outras dancas urbanas.', 7),
  ('FitDance', 'fitdance', 'Coreografias e montagens baseadas em FitDance.', 8),
  ('Infantil', 'infantil', 'Montagens voltadas ao publico infantil.', 9),
  ('Livre', 'livre', 'Estilo livre para casos nao catalogados.', 10)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = true,
  ordem_exibicao = excluded.ordem_exibicao,
  updated_at = now();

alter table public.coreografias
  add column if not exists estilo_id uuid references public.coreografia_estilos(id) on delete restrict;

create index if not exists idx_coreografias_estilo_id
  on public.coreografias(estilo_id);

create or replace function public.normalize_coreografia_estilo_slug(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(
      translate(
        coalesce(value, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

update public.coreografias c
set estilo_id = e.id,
    updated_at = now()
from public.coreografia_estilos e
where c.estilo_id is null
  and c.estilo is not null
  and btrim(c.estilo) <> ''
  and (
    lower(btrim(c.estilo)) = lower(btrim(e.nome))
    or public.normalize_coreografia_estilo_slug(c.estilo) = e.slug
  );

update public.coreografias c
set estilo_id = e.id,
    updated_at = now()
from public.coreografia_estilos e
where c.estilo_id is null
  and e.slug = 'livre';

alter table public.coreografias
  alter column estilo_id set not null;

alter table public.coreografias
  drop column if exists estilo;

alter table public.eventos_escola_edicoes
  add column if not exists descricao text;

update public.eventos_escola_edicoes
set descricao = observacoes,
    updated_at = now()
where descricao is null
  and observacoes is not null
  and btrim(observacoes) <> '';

comment on table public.coreografia_estilos is
  'Cadastro estruturado e reutilizavel de estilos de coreografia.';

comment on column public.coreografias.estilo_id is
  'Referencia ao estilo estruturado da coreografia mestre.';

comment on column public.eventos_escola_edicoes.descricao is
  'Descricao editorial da edicao do evento.';

comment on function public.normalize_coreografia_estilo_slug(text) is
  'Normaliza texto livre legado de estilo para slug ASCII durante migracoes.';

-- Estrategia conservadora de saneamento:
-- - mantemos o titulo do evento-base em public.eventos_escola.titulo
-- - mantemos titulo_exibicao e tema da edicao como estao
-- - nao fazemos troca automatica entre nome do evento-base e tema/titulo da edicao,
--   porque nao existe heuristica segura para isso no legado
-- - a separacao editorial passa a ser corrigida nas telas e APIs de edicao
