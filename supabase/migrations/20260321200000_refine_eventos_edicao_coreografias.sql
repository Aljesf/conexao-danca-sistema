-- =========================================================
-- MODULO: EVENTOS DA ESCOLA
-- FASE: COREOGRAFIAS DA EDICAO
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'evento_coreografia_formacao_enum'
  ) then
    create type public.evento_coreografia_formacao_enum as enum (
      'SOLO',
      'DUO',
      'TRIO',
      'GRUPO',
      'TURMA',
      'LIVRE'
    );
  end if;
end $$;

alter table public.eventos_escola_coreografias
  add column if not exists descricao text,
  add column if not exists tipo_formacao public.evento_coreografia_formacao_enum,
  add column if not exists quantidade_minima_participantes integer,
  add column if not exists quantidade_maxima_participantes integer,
  add column if not exists sugestao_musica text,
  add column if not exists link_musica text,
  add column if not exists valor_participacao_coreografia_centavos integer,
  add column if not exists ativa boolean not null default true;

update public.eventos_escola_coreografias
set
  tipo_formacao = coalesce(tipo_formacao, 'LIVRE'::public.evento_coreografia_formacao_enum),
  quantidade_minima_participantes = coalesce(quantidade_minima_participantes, 1),
  quantidade_maxima_participantes = coalesce(quantidade_maxima_participantes, 20),
  ativa = coalesce(ativa, true)
where
  tipo_formacao is null
  or quantidade_minima_participantes is null
  or quantidade_maxima_participantes is null
  or ativa is null;

alter table public.eventos_escola_coreografias
  alter column tipo_formacao set default 'LIVRE'::public.evento_coreografia_formacao_enum,
  alter column tipo_formacao set not null,
  alter column quantidade_minima_participantes set default 1,
  alter column quantidade_minima_participantes set not null,
  alter column quantidade_maxima_participantes set default 20,
  alter column quantidade_maxima_participantes set not null,
  alter column ativa set default true;

alter table public.eventos_escola_coreografias
  drop constraint if exists chk_eventos_escola_coreografias_qtd_participantes;

alter table public.eventos_escola_coreografias
  add constraint chk_eventos_escola_coreografias_qtd_participantes
  check (
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
  );

alter table public.eventos_escola_coreografias
  drop constraint if exists chk_eventos_escola_coreografias_valor_participacao;

alter table public.eventos_escola_coreografias
  add constraint chk_eventos_escola_coreografias_valor_participacao
  check (
    valor_participacao_coreografia_centavos is null
    or valor_participacao_coreografia_centavos >= 0
  );

alter table public.eventos_escola_coreografias
  drop constraint if exists chk_eventos_escola_coreografias_duracao;

alter table public.eventos_escola_coreografias
  add constraint chk_eventos_escola_coreografias_duracao
  check (
    duracao_estimada_segundos is null
    or duracao_estimada_segundos > 0
  );

drop index if exists idx_eventos_escola_coreografia_participante_unq;

alter table public.eventos_escola_coreografia_participantes
  alter column pessoa_id drop not null;

alter table public.eventos_escola_coreografia_participantes
  add column if not exists aluno_id bigint,
  add column if not exists inscricao_id uuid references public.eventos_escola_inscricoes(id) on delete set null,
  add column if not exists tipo_participante text not null default 'PESSOA',
  add column if not exists ordem_interna integer,
  add column if not exists ativo boolean not null default true;

alter table public.eventos_escola_coreografia_participantes
  drop constraint if exists chk_eventos_escola_coreografia_participantes_ref;

alter table public.eventos_escola_coreografia_participantes
  add constraint chk_eventos_escola_coreografia_participantes_ref
  check (
    pessoa_id is not null
    or aluno_id is not null
    or inscricao_id is not null
  );

create unique index if not exists idx_eventos_escola_coreografia_participante_pessoa_unq
  on public.eventos_escola_coreografia_participantes(coreografia_id, pessoa_id)
  where pessoa_id is not null;

create unique index if not exists idx_eventos_escola_coreografia_participante_aluno_unq
  on public.eventos_escola_coreografia_participantes(coreografia_id, aluno_id)
  where aluno_id is not null;

create unique index if not exists idx_eventos_escola_coreografia_participante_inscricao_unq
  on public.eventos_escola_coreografia_participantes(coreografia_id, inscricao_id)
  where inscricao_id is not null;

create index if not exists idx_eventos_escola_coreografias_tipo_formacao
  on public.eventos_escola_coreografias(tipo_formacao);

create index if not exists idx_eventos_escola_coreografias_ativa
  on public.eventos_escola_coreografias(ativa);

comment on column public.eventos_escola_coreografias.tipo_formacao is
'Modelo de formacao artistica da coreografia, preparado para inscricoes e pauta futura.';

comment on column public.eventos_escola_coreografias.valor_participacao_coreografia_centavos is
'Campo preparatorio para cobranca futura por coreografia, sem automacao financeira nesta etapa.';
