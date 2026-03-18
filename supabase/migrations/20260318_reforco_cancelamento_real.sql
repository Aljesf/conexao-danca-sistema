begin;

alter table public.credito_conexao_lancamentos
add column if not exists centro_custo_id bigint;

do $$
begin
  begin
    alter table public.credito_conexao_lancamentos
      add constraint credito_conexao_lancamentos_centro_custo_id_fkey
      foreign key (centro_custo_id)
      references public.centros_custo(id)
      on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

alter table public.matriculas
add column if not exists cancelamento_tipo text;

alter table public.matriculas
add column if not exists gera_perda_financeira boolean;

alter table public.matriculas
alter column gera_perda_financeira set default false;

create index if not exists idx_credito_conexao_lancamentos_centro_custo_id
  on public.credito_conexao_lancamentos (centro_custo_id);

create index if not exists idx_matriculas_cancelamento_tipo
  on public.matriculas (cancelamento_tipo);

create index if not exists idx_matriculas_gera_perda_financeira
  on public.matriculas (gera_perda_financeira);

comment on column public.credito_conexao_lancamentos.centro_custo_id is
'Centro de custo real do lancamento da conta interna. O agrupador da conta continua representando intermediacao financeira.';

comment on column public.matriculas.cancelamento_tipo is
'DESISTENCIA_REAL, AJUSTE_SISTEMA, DUPLICIDADE, TRANSFERENCIA, TROCA_TURMA, OUTRO';

comment on column public.matriculas.gera_perda_financeira is
'Marca se o cancelamento deve entrar no diagnostico e na tela de perdas financeiras por cancelamento.';

commit;
