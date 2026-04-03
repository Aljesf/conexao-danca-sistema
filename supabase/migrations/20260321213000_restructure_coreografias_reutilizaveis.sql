-- =========================================================
-- MODULO: COREOGRAFIAS REUTILIZAVEIS
-- OBJETIVO:
-- - separar cadastro mestre de coreografias do uso contextual na edicao
-- - preparar elenco contextual por evento/edicao
-- - preservar os dados legados da modelagem antiga
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'coreografia_formacao_enum'
  ) then
    create type public.coreografia_formacao_enum as enum (
      'SOLO',
      'DUO',
      'TRIO',
      'GRUPO',
      'TURMA',
      'LIVRE'
    );
  end if;
end $$;

create table if not exists public.coreografias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  modalidade text,
  tipo_formacao public.coreografia_formacao_enum not null default 'LIVRE',
  quantidade_minima_participantes integer not null default 1,
  quantidade_maxima_participantes integer not null default 20,
  duracao_estimada_segundos integer,
  sugestao_musica text,
  link_musica text,
  estilo text,
  professor_responsavel_id bigint,
  turma_base_id bigint,
  observacoes text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_coreografias_qtd_participantes check (
    (
      tipo_formacao = 'SOLO'
      and quantidade_minima_participantes = 1
      and quantidade_maxima_participantes = 1
    )
    or (
      tipo_formacao = 'DUO'
      and quantidade_minima_participantes = 2
      and quantidade_maxima_participantes = 2
    )
    or (
      tipo_formacao = 'TRIO'
      and quantidade_minima_participantes = 3
      and quantidade_maxima_participantes = 3
    )
    or (
      tipo_formacao in ('GRUPO', 'TURMA', 'LIVRE')
      and quantidade_minima_participantes >= 1
      and quantidade_maxima_participantes >= quantidade_minima_participantes
    )
  ),
  constraint chk_coreografias_duracao check (
    duracao_estimada_segundos is null
    or duracao_estimada_segundos > 0
  )
);

create index if not exists idx_coreografias_nome
  on public.coreografias(nome);

create index if not exists idx_coreografias_tipo_formacao
  on public.coreografias(tipo_formacao);

create index if not exists idx_coreografias_ativa
  on public.coreografias(ativa);

create table if not exists public.eventos_escola_edicao_coreografias (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  coreografia_id uuid not null references public.coreografias(id) on delete restrict,
  subevento_id uuid references public.eventos_escola_subeventos(id) on delete set null,
  ordem_prevista_apresentacao integer,
  valor_participacao_coreografia_centavos integer,
  duracao_prevista_no_evento_segundos integer,
  observacoes_do_evento text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_eventos_escola_edicao_coreografias_valor check (
    valor_participacao_coreografia_centavos is null
    or valor_participacao_coreografia_centavos >= 0
  ),
  constraint chk_eventos_escola_edicao_coreografias_duracao check (
    duracao_prevista_no_evento_segundos is null
    or duracao_prevista_no_evento_segundos > 0
  )
);

create unique index if not exists idx_eventos_escola_edicao_coreografias_unq
  on public.eventos_escola_edicao_coreografias(edicao_id, coreografia_id);

create index if not exists idx_eventos_escola_edicao_coreografias_edicao
  on public.eventos_escola_edicao_coreografias(edicao_id);

create index if not exists idx_eventos_escola_edicao_coreografias_coreografia
  on public.eventos_escola_edicao_coreografias(coreografia_id);

create index if not exists idx_eventos_escola_edicao_coreografias_ordem
  on public.eventos_escola_edicao_coreografias(edicao_id, ordem_prevista_apresentacao);

create table if not exists public.eventos_escola_edicao_coreografia_elenco (
  id uuid primary key default gen_random_uuid(),
  edicao_coreografia_id uuid not null references public.eventos_escola_edicao_coreografias(id) on delete cascade,
  aluno_id bigint,
  pessoa_id bigint,
  inscricao_id uuid references public.eventos_escola_inscricoes(id) on delete set null,
  tipo_participante text,
  ordem_interna integer,
  papel text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_eventos_escola_edicao_coreografia_elenco_ref check (
    aluno_id is not null
    or pessoa_id is not null
    or inscricao_id is not null
  )
);

create unique index if not exists idx_eventos_escola_edicao_coreografia_elenco_pessoa_unq
  on public.eventos_escola_edicao_coreografia_elenco(edicao_coreografia_id, pessoa_id)
  where pessoa_id is not null;

create unique index if not exists idx_eventos_escola_edicao_coreografia_elenco_aluno_unq
  on public.eventos_escola_edicao_coreografia_elenco(edicao_coreografia_id, aluno_id)
  where aluno_id is not null;

create unique index if not exists idx_eventos_escola_edicao_coreografia_elenco_inscricao_unq
  on public.eventos_escola_edicao_coreografia_elenco(edicao_coreografia_id, inscricao_id)
  where inscricao_id is not null;

create index if not exists idx_eventos_escola_edicao_coreografia_elenco_coreografia
  on public.eventos_escola_edicao_coreografia_elenco(edicao_coreografia_id);

create temporary table tmp_coreografias_migracao on commit drop as
select
  legado.id as legado_coreografia_id,
  gen_random_uuid() as coreografia_mestre_id
from public.eventos_escola_coreografias legado
left join public.eventos_escola_edicao_coreografias vinculo
  on vinculo.id = legado.id
where vinculo.id is null;

insert into public.coreografias (
  id,
  nome,
  descricao,
  modalidade,
  tipo_formacao,
  quantidade_minima_participantes,
  quantidade_maxima_participantes,
  duracao_estimada_segundos,
  sugestao_musica,
  link_musica,
  estilo,
  professor_responsavel_id,
  turma_base_id,
  observacoes,
  ativa,
  created_at,
  updated_at
)
select
  mapa.coreografia_mestre_id,
  legado.titulo,
  legado.descricao,
  legado.categoria,
  legado.tipo_formacao::text::public.coreografia_formacao_enum,
  legado.quantidade_minima_participantes,
  legado.quantidade_maxima_participantes,
  legado.duracao_estimada_segundos,
  legado.sugestao_musica,
  legado.link_musica,
  legado.estilo,
  legado.professor_responsavel_id,
  legado.turma_base_id,
  null,
  legado.ativa,
  legado.created_at,
  legado.updated_at
from tmp_coreografias_migracao mapa
join public.eventos_escola_coreografias legado
  on legado.id = mapa.legado_coreografia_id;

insert into public.eventos_escola_edicao_coreografias (
  id,
  edicao_id,
  coreografia_id,
  subevento_id,
  ordem_prevista_apresentacao,
  valor_participacao_coreografia_centavos,
  duracao_prevista_no_evento_segundos,
  observacoes_do_evento,
  ativa,
  created_at,
  updated_at
)
select
  legado.id,
  legado.edicao_id,
  mapa.coreografia_mestre_id,
  legado.subevento_id,
  legado.ordem_apresentacao,
  legado.valor_participacao_coreografia_centavos,
  null,
  legado.observacoes,
  legado.ativa,
  legado.created_at,
  legado.updated_at
from tmp_coreografias_migracao mapa
join public.eventos_escola_coreografias legado
  on legado.id = mapa.legado_coreografia_id;

insert into public.eventos_escola_edicao_coreografia_elenco (
  id,
  edicao_coreografia_id,
  aluno_id,
  pessoa_id,
  inscricao_id,
  tipo_participante,
  ordem_interna,
  papel,
  observacao,
  ativo,
  created_at,
  updated_at
)
select
  participante.id,
  participante.coreografia_id,
  participante.aluno_id,
  participante.pessoa_id,
  participante.inscricao_id,
  participante.tipo_participante,
  participante.ordem_interna,
  participante.papel,
  participante.observacoes,
  participante.ativo,
  participante.created_at,
  now()
from public.eventos_escola_coreografia_participantes participante
join tmp_coreografias_migracao mapa
  on mapa.legado_coreografia_id = participante.coreografia_id
on conflict (id) do nothing;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.eventos_escola_turmas_vinculos'::regclass
    and contype = 'f'
    and conname = 'eventos_escola_turmas_vinculos_coreografia_id_fkey';

  if constraint_name is not null then
    execute format(
      'alter table public.eventos_escola_turmas_vinculos drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.eventos_escola_turmas_vinculos
  add constraint eventos_escola_turmas_vinculos_coreografia_id_fkey
  foreign key (coreografia_id)
  references public.eventos_escola_edicao_coreografias(id)
  on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.eventos_escola_sessao_atividades'::regclass
      and conname = 'eventos_escola_sessao_atividades_coreografia_id_fkey'
  ) then
    alter table public.eventos_escola_sessao_atividades
      add constraint eventos_escola_sessao_atividades_coreografia_id_fkey
      foreign key (coreografia_id)
      references public.eventos_escola_edicao_coreografias(id)
      on delete set null;
  end if;
end $$;

comment on table public.coreografias is
'Cadastro mestre de coreografias reutilizavel em eventos internos, externos, competicoes e apresentacoes diversas.';

comment on table public.eventos_escola_edicao_coreografias is
'Vinculo contextual entre a coreografia mestre e a edicao do evento, com ordem, valor e observacoes especificas daquele uso.';

comment on table public.eventos_escola_edicao_coreografia_elenco is
'Elenco contextual da coreografia dentro da edicao do evento, preparado para inscricoes futuras e historico artistico.';
