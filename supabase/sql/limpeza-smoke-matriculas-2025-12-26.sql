begin;

-- Ajuste os ids aqui se necessario
-- Matriculas de teste:
-- 9, 10, 11, 12

-- 1) Auditoria de eventos
delete from public.matricula_eventos
where matricula_id in (9,10,11,12);

-- 2) Recebimentos ligados a cobrancas de entrada dessas matriculas
delete from public.recebimentos r
where exists (
  select 1
  from public.cobrancas c
  where c.id = r.cobranca_id
    and c.origem_tipo = 'MATRICULA_ENTRADA'
    and c.origem_id in (9,10,11,12)
);

-- 3) Cobrancas de entrada
delete from public.cobrancas
where origem_tipo = 'MATRICULA_ENTRADA'
  and origem_id in (9,10,11,12);

-- 4) Lancamentos do Cartao Conexao originados por matricula
delete from public.credito_conexao_lancamentos
where origem_sistema = 'MATRICULA'
  and origem_id in (9,10,11,12);

-- 5) Vinculos turma_aluno (se houver)
delete from public.turma_aluno
where matricula_id in (9,10,11,12);

-- 6) Matriculas
delete from public.matriculas
where id in (9,10,11,12);

commit;
