-- Adiciona status CONCLUIDA para faturas zeradas (ex: cancelamento de todos os lançamentos).
-- CONCLUIDA indica que a fatura existiu mas não tem mais valor a cobrar —
-- diferente de CANCELADA que indica erro ou desfazimento.

ALTER TABLE public.credito_conexao_faturas
  DROP CONSTRAINT IF EXISTS credito_conexao_faturas_status_chk;

ALTER TABLE public.credito_conexao_faturas
  ADD CONSTRAINT credito_conexao_faturas_status_chk
  CHECK (status = ANY (ARRAY[
    'ABERTA', 'FECHADA', 'PAGA', 'EM_ATRASO', 'CANCELADA', 'CONCLUIDA'
  ]));
