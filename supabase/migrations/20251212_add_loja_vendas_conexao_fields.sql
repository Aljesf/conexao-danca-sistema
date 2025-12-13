-- Adiciona colunas para integração com Crédito Conexão na tabela de vendas da loja
alter table public."loja_vendas"
  add column if not exists conta_conexao_id bigint,
  add column if not exists numero_parcelas integer;

