begin;

alter table public.eventos_escola_inscricoes
  add column if not exists financeiro_status text,
  add column if not exists financeiro_erro_codigo text null,
  add column if not exists financeiro_erro_detalhe text null,
  add column if not exists financeiro_processado_em timestamptz null;

update public.eventos_escola_inscricoes
set financeiro_status = coalesce(financeiro_status, 'PENDENTE')
where financeiro_status is null;

alter table public.eventos_escola_inscricoes
  alter column financeiro_status set default 'PENDENTE',
  alter column financeiro_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'eventos_escola_inscricoes_financeiro_status_chk'
      and conrelid = 'public.eventos_escola_inscricoes'::regclass
  ) then
    alter table public.eventos_escola_inscricoes
      add constraint eventos_escola_inscricoes_financeiro_status_chk
      check (
        financeiro_status in ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'ERRO')
      );
  end if;
end $$;

create index if not exists idx_eventos_escola_inscricoes_financeiro_status
  on public.eventos_escola_inscricoes (financeiro_status);

create or replace view public.v_eventos_inscricoes_financeiro_diagnostico as
select
  inscricao.id as inscricao_id,
  inscricao.edicao_id,
  inscricao.participante_nome_snapshot,
  inscricao.origem_inscricao as origem,
  inscricao.destino_financeiro,
  inscricao.status_inscricao,
  inscricao.financeiro_status,
  inscricao.financeiro_erro_codigo,
  inscricao.financeiro_processado_em,
  (
    select count(*)
    from public.eventos_escola_inscricao_itens item
    where item.inscricao_id = inscricao.id
      and item.status <> 'CANCELADO'
  ) as total_itens_ativos,
  (
    select count(*)
    from public.eventos_escola_inscricao_item_movimentos_financeiros movimento_item
    where movimento_item.inscricao_id = inscricao.id
  ) as total_movimentos_financeiros_item,
  (
    select count(*)
    from public.eventos_escola_inscricao_parcelas_conta_interna parcela
    where parcela.inscricao_id = inscricao.id
  ) as total_parcelas_conta_interna,
  (
    select count(*)
    from (
      select 'c:' || inscricao.cobranca_id::text as chave
      where inscricao.cobranca_id is not null
      union
      select 'ca:' || inscricao.cobranca_avulsa_id::text
      where inscricao.cobranca_avulsa_id is not null
      union
      select 'c:' || movimento_item.cobranca_id::text
      from public.eventos_escola_inscricao_item_movimentos_financeiros movimento_item
      where movimento_item.inscricao_id = inscricao.id
        and movimento_item.cobranca_id is not null
      union
      select 'ca:' || movimento_item.cobranca_avulsa_id::text
      from public.eventos_escola_inscricao_item_movimentos_financeiros movimento_item
      where movimento_item.inscricao_id = inscricao.id
        and movimento_item.cobranca_avulsa_id is not null
      union
      select 'c:' || parcela.cobranca_id::text
      from public.eventos_escola_inscricao_parcelas_conta_interna parcela
      where parcela.inscricao_id = inscricao.id
        and parcela.cobranca_id is not null
      union
      select 'c:' || referencia.cobranca_id::text
      from public.eventos_escola_financeiro_referencias referencia
      where referencia.edicao_id = inscricao.edicao_id
        and referencia.cobranca_id is not null
        and (
          referencia.observacoes ilike 'Inscricao ' || inscricao.id::text || '%'
          or referencia.observacoes ilike 'Ampliacao da inscricao ' || inscricao.id::text || '%'
        )
    ) cobrancas_relacionadas
  ) as total_cobrancas_relacionadas,
  (
    select count(*)
    from (
      select inscricao.recebimento_id::text as chave
      where inscricao.recebimento_id is not null
      union
      select movimento_item.recebimento_id::text
      from public.eventos_escola_inscricao_item_movimentos_financeiros movimento_item
      where movimento_item.inscricao_id = inscricao.id
        and movimento_item.recebimento_id is not null
      union
      select referencia.recebimento_id::text
      from public.eventos_escola_financeiro_referencias referencia
      where referencia.edicao_id = inscricao.edicao_id
        and referencia.recebimento_id is not null
        and (
          referencia.observacoes ilike 'Inscricao ' || inscricao.id::text || '%'
          or referencia.observacoes ilike 'Ampliacao da inscricao ' || inscricao.id::text || '%'
        )
    ) recebimentos_relacionados
  ) as total_recebimentos_relacionados,
  (
    select count(*)
    from (
      select inscricao.lancamento_conta_interna_id::text as chave
      where inscricao.lancamento_conta_interna_id is not null
      union
      select movimento_item.lancamento_conta_interna_id::text
      from public.eventos_escola_inscricao_item_movimentos_financeiros movimento_item
      where movimento_item.inscricao_id = inscricao.id
        and movimento_item.lancamento_conta_interna_id is not null
      union
      select parcela.lancamento_conta_interna_id::text
      from public.eventos_escola_inscricao_parcelas_conta_interna parcela
      where parcela.inscricao_id = inscricao.id
        and parcela.lancamento_conta_interna_id is not null
    ) lancamentos_relacionados
  ) as total_credito_conexao_lancamentos_relacionados
from public.eventos_escola_inscricoes inscricao;

commit;
