-- Objetivo:
-- unificar conta interna como origem canonica do financeiro de aluno e colaborador
-- remover leituras que tratem pagamentos do ato como fora da conta interna

create table if not exists public.financeiro_conta_interna_reconciliacao_log (
  id bigserial primary key,
  tipo text not null,
  conta_conexao_id bigint,
  competencia text,
  fatura_id bigint,
  cobranca_id bigint,
  lancamento_id bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

update public.credito_conexao_contas
   set descricao_exibicao = case
     when upper(coalesce(tipo_conta, '')) = 'COLABORADOR' then 'Conta interna do colaborador'
     else 'Conta interna do aluno'
   end
 where coalesce(descricao_exibicao, '') = ''
    or descricao_exibicao ilike '%cartao conexao%'
    or descricao_exibicao ilike '%credito conexao%';

update public.cobrancas
   set origem_agrupador_tipo = 'CONTA_INTERNA',
       origem_agrupador_id = coalesce(origem_agrupador_id, conta_interna_id),
       origem_label = case
         when coalesce(origem_label, '') ilike 'cartao conexao%' then regexp_replace(origem_label, '(?i)cartao conexao', 'Conta interna')
         when coalesce(origem_label, '') ilike 'credito conexao%' then regexp_replace(origem_label, '(?i)credito conexao', 'Conta interna')
         else origem_label
       end,
       descricao = case
         when coalesce(descricao, '') ilike 'cartao conexao%' then regexp_replace(descricao, '(?i)cartao conexao', 'Conta interna')
         when coalesce(descricao, '') ilike 'credito conexao%' then regexp_replace(descricao, '(?i)credito conexao', 'Conta interna')
         else descricao
       end,
       origem_subtipo = case
         when upper(coalesce(origem_subtipo, '')) = 'CARTAO_CONEXAO' then 'CONTA_INTERNA_MENSALIDADE'
         else origem_subtipo
       end,
       updated_at = now()
 where conta_interna_id is not null
   and (
     coalesce(origem_agrupador_tipo, '') <> 'CONTA_INTERNA'
     or coalesce(origem_label, '') ilike '%cartao conexao%'
     or coalesce(origem_label, '') ilike '%credito conexao%'
     or coalesce(descricao, '') ilike 'cartao conexao%'
     or coalesce(descricao, '') ilike 'credito conexao%'
     or upper(coalesce(origem_subtipo, '')) = 'CARTAO_CONEXAO'
   );

update public.credito_conexao_lancamentos
   set descricao = case
         when coalesce(descricao, '') ilike 'cartao conexao%' then regexp_replace(descricao, '(?i)cartao conexao', 'Conta interna')
         when coalesce(descricao, '') ilike 'credito conexao%' then regexp_replace(descricao, '(?i)credito conexao', 'Conta interna')
         else descricao
       end,
       composicao_json = coalesce(composicao_json, '{}'::jsonb)
         || jsonb_build_object('origem_canonica_financeira', 'CONTA_INTERNA'),
       updated_at = now()
 where conta_conexao_id is not null
   and (
     coalesce(descricao, '') ilike 'cartao conexao%'
     or coalesce(descricao, '') ilike 'credito conexao%'
     or coalesce(composicao_json, '{}'::jsonb)->>'origem_canonica_financeira' is distinct from 'CONTA_INTERNA'
   );

insert into public.financeiro_conta_interna_reconciliacao_log (
  tipo,
  conta_conexao_id,
  competencia,
  fatura_id,
  cobranca_id,
  payload
)
values (
  'REGRA_CANONICA_CONTA_INTERNA_20260323',
  41,
  '2026-03',
  364,
  445,
  jsonb_build_object(
    'descricao', 'Aluno e colaborador passam a nascer e permanecer na conta interna, inclusive quando pagos no ato.',
    'duplicidade_cancelada', 455,
    'fatura_canonica_quitada', 364
  )
);
