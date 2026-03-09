begin;

update public.documentos_modelo as modelo
set operacao_id = operacao.id
from public.documentos_operacoes as operacao
where modelo.operacao_id is null
  and operacao.codigo = 'RECIBO_PAGAMENTO_CONFIRMADO'
  and modelo.titulo = 'Recibo de Pagamento de Mensalidade';

commit;

select pg_notify('pgrst', 'reload schema');
