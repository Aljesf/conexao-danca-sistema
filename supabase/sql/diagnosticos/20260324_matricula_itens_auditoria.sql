-- Auditoria operacional da nova camada matricula_itens
-- Uso:
-- 1) validar matriculas com múltiplos itens
-- 2) validar turma_aluno apontando para matricula_item_id
-- 3) validar ausência de cobrança mensal paralela MATRICULA/CARTAO_CONEXAO

-- 1) Matrículas com múltiplos itens
select
  mi.matricula_id,
  count(*) as total_itens,
  count(*) filter (where upper(coalesce(mi.status, '')) = 'ATIVO') as total_itens_ativos
from public.matricula_itens mi
group by mi.matricula_id
having count(*) > 1
order by mi.matricula_id desc;

-- 2) Vínculos operacionais de turma apontando para item granular
select
  ta.turma_aluno_id,
  ta.matricula_id,
  ta.matricula_item_id,
  ta.turma_id,
  ta.aluno_pessoa_id,
  ta.dt_inicio,
  ta.dt_fim,
  ta.status
from public.turma_aluno ta
where ta.matricula_item_id is not null
order by ta.matricula_id desc nulls last, ta.turma_aluno_id desc;

-- 3) Matrículas que ainda criam ou reaproveitam cobrança mensal paralela indevida
select
  c.id as cobranca_id,
  c.origem_id as matricula_id,
  c.origem_tipo,
  c.origem_subtipo,
  c.competencia_ano_mes,
  c.status,
  c.valor_centavos
from public.cobrancas c
where upper(coalesce(c.origem_tipo, '')) = 'MATRICULA'
  and upper(coalesce(c.origem_subtipo, '')) in ('CARTAO_CONEXAO', 'CONTA_INTERNA_MENSALIDADE')
order by c.id desc;
