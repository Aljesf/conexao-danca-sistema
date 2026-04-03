begin;

-- ============================================================
-- Reativacao formal de matriculas com historico estrutural
-- ============================================================
-- Esta migration estende a modelagem atual sem remover legado:
-- 1) matriculas passam a registrar metadados de reativacao
-- 2) matricula_itens ganha carimbo de cancelamento/retorno
-- 3) matricula_eventos passa a suportar eventos estruturais

alter table public.matriculas
  add column if not exists reativada_em timestamptz null,
  add column if not exists reativada_por_user_id uuid null,
  add column if not exists motivo_reativacao text null;

comment on column public.matriculas.reativada_em is
  'Data/hora da ultima reativacao formal da matricula.';
comment on column public.matriculas.reativada_por_user_id is
  'Usuario que executou a ultima reativacao formal da matricula.';
comment on column public.matriculas.motivo_reativacao is
  'Motivo administrativo informado no retorno da matricula cancelada.';

create index if not exists idx_matriculas_reativada_em
  on public.matriculas (reativada_em desc);

alter table public.matricula_itens
  add column if not exists cancelado_em timestamptz null,
  add column if not exists reativado_em timestamptz null,
  add column if not exists reativado_por_user_id uuid null;

comment on column public.matricula_itens.cancelado_em is
  'Carimbo operacional de cancelamento do item da matricula.';
comment on column public.matricula_itens.reativado_em is
  'Data/hora da reativacao do item reaproveitado no retorno da aluna.';
comment on column public.matricula_itens.reativado_por_user_id is
  'Usuario que reativou o item da matricula.';

create index if not exists idx_matricula_itens_cancelado_em
  on public.matricula_itens (cancelado_em desc);

create index if not exists idx_matricula_itens_reativado_em
  on public.matricula_itens (reativado_em desc);

alter table public.matricula_eventos
  add column if not exists modulo_id bigint null,
  add column if not exists turma_origem_id bigint null,
  add column if not exists turma_destino_id bigint null,
  add column if not exists observacao text null,
  add column if not exists created_by uuid null;

comment on column public.matricula_eventos.modulo_id is
  'Modulo/produto relacionado ao evento estrutural quando aplicavel.';
comment on column public.matricula_eventos.turma_origem_id is
  'Turma anterior relacionada ao evento estrutural.';
comment on column public.matricula_eventos.turma_destino_id is
  'Nova turma relacionada ao evento estrutural.';
comment on column public.matricula_eventos.observacao is
  'Observacao administrativa objetiva do evento.';
comment on column public.matricula_eventos.created_by is
  'Usuario que registrou o evento.';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'matricula_eventos_tipo_evento_chk'
      and conrelid = 'public.matricula_eventos'::regclass
  ) then
    alter table public.matricula_eventos
      drop constraint matricula_eventos_tipo_evento_chk;
  end if;

  alter table public.matricula_eventos
    add constraint matricula_eventos_tipo_evento_chk
    check (
      tipo_evento in (
        'CRIADA',
        'CANCELADA',
        'REATIVADA',
        'CONCLUIDA',
        'MODULO_ADICIONADO',
        'MODULO_REMOVIDO',
        'TURMA_TROCADA',
        'EXCECAO_PRIMEIRO_PAGAMENTO_CONCEDIDA',
        'EXCECAO_PRIMEIRO_PAGAMENTO_REVOGADA',
        'OBSERVACAO_INTERNA',
        'STATUS_ALTERADO'
      )
    );
end $$;

create index if not exists idx_matricula_eventos_modulo_id
  on public.matricula_eventos (modulo_id);

create index if not exists idx_matricula_eventos_turma_origem_id
  on public.matricula_eventos (turma_origem_id);

create index if not exists idx_matricula_eventos_turma_destino_id
  on public.matricula_eventos (turma_destino_id);

commit;
