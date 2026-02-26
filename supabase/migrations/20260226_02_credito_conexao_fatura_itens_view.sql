begin;

create or replace view public.vw_credito_conexao_fatura_itens as
select
  f.id as fatura_id,
  f.conta_conexao_id,
  f.periodo_referencia as competencia_ano_mes,
  f.data_fechamento,
  f.data_vencimento,
  f.valor_total_centavos,
  f.status as status_fatura,
  f.cobranca_id as cobranca_fatura_id,

  cc.pessoa_titular_id,
  pt.nome as titular_nome,
  pt.cpf as titular_cpf,
  pt.telefone as titular_telefone,

  l.id as lancamento_id,
  l.origem_sistema,
  l.origem_id,
  coalesce(l.descricao, '') as descricao,
  l.valor_centavos,
  l.data_lancamento,
  l.status as status_lancamento,
  l.composicao_json
from public.credito_conexao_faturas f
join public.credito_conexao_contas cc on cc.id = f.conta_conexao_id
join public.pessoas pt on pt.id = cc.pessoa_titular_id
join public.credito_conexao_fatura_lancamentos fl on fl.fatura_id = f.id
join public.credito_conexao_lancamentos l on l.id = fl.lancamento_id;

comment on view public.vw_credito_conexao_fatura_itens is
'Extrato detalhado por fatura do Cartao Conexao (itens/lancamentos + metadados do titular).';

commit;
