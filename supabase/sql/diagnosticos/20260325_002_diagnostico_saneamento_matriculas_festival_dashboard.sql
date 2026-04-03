-- Diagnostico de saneamento: matriculas, festival e dashboard financeiro
-- Data de referencia: 2026-03-25
-- Objetivo:
-- 1) localizar matriculas ativas concorrentes
-- 2) detalhar a matricula #29 da Lylou/Lilu e a matricula valida remanescente
-- 3) localizar residuos artificiais do festival
-- 4) identificar cobrancas canceladas que ainda aparecem como pendencia operacional
-- 5) diagnosticar os casos citados de reprocessamento financeiro do festival

-- =========================================================
-- 1. Matriculas duplicadas por aluno
-- =========================================================
with matriculas_por_pessoa as (
  select
    m.pessoa_id,
    p.nome,
    count(*) as quantidade_matriculas,
    count(*) filter (where m.status = 'ATIVA') as quantidade_ativas,
    string_agg(m.id::text, ', ' order by m.id) as matricula_ids,
    string_agg(coalesce(m.status, 'SEM_STATUS'), ', ' order by m.id) as status_matriculas,
    string_agg(coalesce(to_char(m.data_matricula, 'YYYY-MM-DD'), '-'), ', ' order by m.id) as datas_matricula
  from public.matriculas m
  left join public.pessoas p on p.id = m.pessoa_id
  group by m.pessoa_id, p.nome
)
select *
from matriculas_por_pessoa
where quantidade_matriculas > 1
order by quantidade_ativas desc, quantidade_matriculas desc, nome nulls last;

-- Foco especial: Lylou / Lilu
select
  m.id,
  p.nome as pessoa_nome,
  m.status,
  m.data_matricula,
  m.data_inicio_vinculo,
  m.data_encerramento,
  m.vinculo_id,
  t.nome as turma_nome,
  m.total_mensalidade_centavos
from public.matriculas m
left join public.pessoas p on p.id = m.pessoa_id
left join public.turmas t on t.turma_id = m.vinculo_id
where m.id in (29, 49)
order by m.id;

-- =========================================================
-- 2. Itens e valores vinculados as matriculas afetadas
-- =========================================================
select
  mi.id as matricula_item_id,
  mi.matricula_id,
  mi.descricao,
  mi.origem_tipo,
  mi.status,
  mi.valor_base_centavos,
  mi.valor_liquido_centavos,
  mi.turma_id_inicial,
  t.nome as turma_inicial_nome,
  ta.turma_aluno_id,
  ta.turma_id as turma_operacional_id,
  ta.status as turma_aluno_status,
  ta.dt_inicio,
  ta.dt_fim
from public.matricula_itens mi
left join public.turmas t on t.turma_id = mi.turma_id_inicial
left join public.turma_aluno ta on ta.matricula_item_id = mi.id
where mi.matricula_id in (29, 49)
order by mi.matricula_id, mi.id, ta.turma_aluno_id;

select
  mev.id,
  mev.matricula_id,
  mev.turma_id,
  mev.valor_mensal_centavos,
  mev.origem_valor,
  mev.modelo_liquidacao,
  mev.ativo
from public.matricula_execucao_valores mev
where mev.matricula_id in (29, 49)
order by mev.matricula_id, mev.id;

-- =========================================================
-- 3. Registros artificiais / residuos do festival
-- =========================================================
-- 3.1 Batch tecnico explicito por descricao
select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.origem_tipo,
  c.origem_subtipo,
  c.valor_centavos,
  c.competencia_ano_mes,
  c.created_at
from public.cobrancas c
where c.descricao ilike 'Teste tecnico inscricoes 20260322015500%'
order by c.created_at, c.id;

select
  l.id as lancamento_id,
  l.descricao,
  l.status,
  l.origem_sistema,
  l.origem_id,
  l.cobranca_id,
  l.competencia,
  l.referencia_item,
  l.created_at
from public.credito_conexao_lancamentos l
where l.descricao ilike 'Teste tecnico inscricoes 20260322015500%'
order by l.created_at, l.id;

-- 3.2 Casos citados pelo usuario
select
  i.id as inscricao_id,
  i.participante_nome_snapshot,
  i.status_inscricao,
  i.status_financeiro,
  i.financeiro_status,
  i.financeiro_erro_codigo,
  i.financeiro_erro_detalhe,
  i.cobranca_id,
  i.recebimento_id,
  i.lancamento_conta_interna_id,
  i.created_at,
  e.titulo_exibicao as edicao_titulo,
  ev.titulo as evento_titulo
from public.eventos_escola_inscricoes i
left join public.eventos_escola_edicoes e on e.id = i.edicao_id
left join public.eventos_escola ev on ev.id = e.evento_id
where i.participante_nome_snapshot ilike any (
  array[
    '%Maria Cecilia%',
    '%Maria Cecília%',
    '%Evelin%',
    '%Luna%',
    '%Lunna%',
    '%Ana Julia%',
    '%Ana Júlia%'
  ]
)
order by i.created_at;

select
  c.id as cobranca_id,
  c.descricao,
  c.status,
  c.origem_tipo,
  c.origem_subtipo,
  c.valor_centavos,
  c.competencia_ano_mes,
  c.created_at
from public.cobrancas c
where c.id in (462, 468, 486, 505, 515, 516)
order by c.id;

-- =========================================================
-- 4. Residuos do dashboard financeiro
-- =========================================================
-- Cobrancas da matricula #29 canceladas, mas ainda aparecendo com status operacional de pendencia.
select
  c.id as cobranca_id,
  c.status,
  c.cancelada_em,
  c.cancelada_motivo,
  c.expurgada,
  c.origem_tipo,
  c.origem_subtipo,
  c.origem_id,
  c.descricao,
  v.status_operacional,
  v.saldo_aberto_centavos
from public.cobrancas c
left join public.vw_financeiro_cobrancas_operacionais v on v.cobranca_id = c.id
where c.origem_tipo = 'MATRICULA'
  and c.origem_id = 29
order by c.id;

-- Residuos do batch tecnico do festival por descricao.
select
  c.id as cobranca_id,
  c.status,
  c.expurgada,
  c.cancelada_em,
  c.descricao,
  v.status_operacional,
  v.saldo_aberto_centavos
from public.cobrancas c
left join public.vw_financeiro_cobrancas_operacionais v on v.cobranca_id = c.id
where c.descricao ilike 'Teste tecnico inscricoes 20260322015500%'
order by c.id;

-- =========================================================
-- 5. Casos de reprocessamento financeiro: Luna / Ana Julia
-- =========================================================
-- Nota: no banco ativo de 2026-03-25, os nomes encontrados sao
-- "Lunna Moura Monteiro" e "Ana Julia Assunção Brito Noronha".
select
  i.id as inscricao_id,
  i.participante_nome_snapshot,
  i.status_inscricao,
  i.status_financeiro,
  i.financeiro_status,
  i.financeiro_erro_codigo,
  i.financeiro_erro_detalhe,
  i.valor_total_centavos,
  i.cobranca_id,
  i.recebimento_id,
  i.lancamento_conta_interna_id,
  i.created_at
from public.eventos_escola_inscricoes i
where i.participante_nome_snapshot ilike any (
  array['%Luna%', '%Lunna%', '%Ana Julia%', '%Ana Júlia%']
)
order by i.created_at;

-- Casos ainda efetivamente quebrados no modulo de inscricoes/eventos.
select
  i.id as inscricao_id,
  i.participante_nome_snapshot,
  i.status_inscricao,
  i.financeiro_status,
  i.financeiro_erro_codigo,
  i.financeiro_erro_detalhe,
  i.cobranca_id,
  i.recebimento_id,
  i.lancamento_conta_interna_id,
  i.created_at
from public.eventos_escola_inscricoes i
where i.financeiro_status in ('ERRO', 'PROCESSANDO')
order by i.created_at desc;
