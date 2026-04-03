-- =========================================================
-- MÓDULO: EVENTOS DA ESCOLA
-- FASE: CALENDÁRIO DA EDIÇÃO
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'evento_edicao_calendario_tipo_enum'
  ) then
    create type public.evento_edicao_calendario_tipo_enum as enum (
      'INSCRICAO',
      'ENSAIO',
      'APRESENTACAO',
      'REUNIAO',
      'PRAZO_INTERNO',
      'OUTRO'
    );
  end if;
end $$;

create table if not exists public.eventos_escola_edicao_calendario_itens (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  tipo public.evento_edicao_calendario_tipo_enum not null,
  titulo text not null,
  descricao text,
  inicio timestamptz not null,
  fim timestamptz,
  dia_inteiro boolean not null default false,
  local_nome text,
  cidade text,
  endereco text,
  reflete_no_calendario_escola boolean not null default false,
  turma_id bigint references public.turmas(turma_id) on delete set null,
  grupo_id bigint references public.aluno_grupos(id) on delete set null,
  ordem integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eventos_escola_edicao_calendario_itens
  drop constraint if exists chk_eventos_escola_edicao_calendario_fim;

alter table public.eventos_escola_edicao_calendario_itens
  add constraint chk_eventos_escola_edicao_calendario_fim
  check (fim is null or fim >= inicio);

create index if not exists idx_eventos_escola_edicao_calendario_edicao
  on public.eventos_escola_edicao_calendario_itens(edicao_id);

create index if not exists idx_eventos_escola_edicao_calendario_inicio
  on public.eventos_escola_edicao_calendario_itens(inicio);

create index if not exists idx_eventos_escola_edicao_calendario_reflexo
  on public.eventos_escola_edicao_calendario_itens(reflete_no_calendario_escola, inicio);

create index if not exists idx_eventos_escola_edicao_calendario_turma
  on public.eventos_escola_edicao_calendario_itens(turma_id);

create index if not exists idx_eventos_escola_edicao_calendario_grupo
  on public.eventos_escola_edicao_calendario_itens(grupo_id);

comment on table public.eventos_escola_edicao_calendario_itens is
'Calendário interno da edição do evento. Pode refletir itens no calendário geral da escola sem duplicação física.';

comment on column public.eventos_escola_edicao_calendario_itens.reflete_no_calendario_escola is
'Quando verdadeiro, o item pode ser exibido no feed geral do calendário da escola.';
