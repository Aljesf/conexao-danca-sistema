-- Plano diagnostico de unificacao dos 10 casos remanescentes de duplicidade
-- historica de matricula ATIVA.
--
-- Regra aplicada neste arquivo:
-- - matricula mais antiga = ancora/principal
-- - matricula mais nova   = secundaria/origem dos itens
-- - acao_sugerida         = UNIFICAR
--
-- Este arquivo nao altera dados. Ele apenas consolida a leitura dos pares
-- para apoiar a migration controlada de unificacao.

-- ============================================================
-- 1) RESUMO POR PAR
-- ============================================================
with pares(pessoa_id, matricula_ancora_sugerida, matricula_secundaria_sugerida) as (
  values
    (56, 2, 103),
    (76, 13, 31),
    (195, 25, 50),
    (159, 101, 119),
    (72, 46, 113),
    (105, 30, 67),
    (140, 19, 104),
    (157, 24, 56),
    (99, 22, 88),
    (184, 81, 106)
)
select
  p.pessoa_id,
  pessoa.nome,
  p.matricula_ancora_sugerida,
  p.matricula_secundaria_sugerida,
  mp.data_matricula as data_matricula_principal,
  ms.data_matricula as data_matricula_secundaria,
  mp.status::text as status_principal,
  ms.status::text as status_secundaria,
  mp.total_mensalidade_centavos as total_principal_centavos,
  ms.total_mensalidade_centavos as total_secundaria_centavos,
  (select count(*) from public.matricula_itens mi where mi.matricula_id = p.matricula_ancora_sugerida) as itens_principal,
  (select count(*) from public.matricula_itens mi where mi.matricula_id = p.matricula_secundaria_sugerida) as itens_secundaria,
  (select count(*) from public.turma_aluno ta where ta.matricula_id = p.matricula_ancora_sugerida) as turma_aluno_principal,
  (select count(*) from public.turma_aluno ta where ta.matricula_id = p.matricula_secundaria_sugerida) as turma_aluno_secundaria,
  (select count(*) from public.cobrancas c where c.origem_tipo = 'MATRICULA' and c.origem_id = p.matricula_ancora_sugerida) as cobrancas_principal,
  (select count(*) from public.cobrancas c where c.origem_tipo = 'MATRICULA' and c.origem_id = p.matricula_secundaria_sugerida) as cobrancas_secundaria,
  (select count(*) from public.recebimentos r join public.cobrancas c on c.id = r.cobranca_id where c.origem_tipo = 'MATRICULA' and c.origem_id = p.matricula_ancora_sugerida) as recebimentos_principal,
  (select count(*) from public.recebimentos r join public.cobrancas c on c.id = r.cobranca_id where c.origem_tipo = 'MATRICULA' and c.origem_id = p.matricula_secundaria_sugerida) as recebimentos_secundaria,
  (select count(*) from public.credito_conexao_lancamentos l where l.matricula_id = p.matricula_ancora_sugerida) as lancamentos_cartao_principal,
  (select count(*) from public.credito_conexao_lancamentos l where l.matricula_id = p.matricula_secundaria_sugerida) as lancamentos_cartao_secundaria,
  'UNIFICAR'::text as acao_sugerida
from pares p
join public.pessoas pessoa
  on pessoa.id = p.pessoa_id
join public.matriculas mp
  on mp.id = p.matricula_ancora_sugerida
join public.matriculas ms
  on ms.id = p.matricula_secundaria_sugerida
order by pessoa.nome;

-- ============================================================
-- 2) ITENS DA PRINCIPAL E DA SECUNDARIA
-- ============================================================
with pares(pessoa_id, matricula_ancora_sugerida, matricula_secundaria_sugerida) as (
  values
    (56, 2, 103),
    (76, 13, 31),
    (195, 25, 50),
    (159, 101, 119),
    (72, 46, 113),
    (105, 30, 67),
    (140, 19, 104),
    (157, 24, 56),
    (99, 22, 88),
    (184, 81, 106)
)
select
  p.pessoa_id,
  pessoa.nome,
  p.matricula_ancora_sugerida,
  p.matricula_secundaria_sugerida,
  case
    when mi.matricula_id = p.matricula_ancora_sugerida then 'PRINCIPAL'
    when mi.matricula_id = p.matricula_secundaria_sugerida then 'SECUNDARIA'
    else 'FORA_DO_PAR'
  end as papel_matricula,
  mi.id as matricula_item_id,
  mi.matricula_id,
  mi.origem_tipo,
  mi.descricao,
  mi.status,
  mi.valor_base_centavos,
  mi.valor_liquido_centavos,
  mi.data_inicio,
  mi.data_fim,
  turma_inicial.nome as turma_inicial,
  turma_atual.nome as turma_operacional_atual,
  ta.turma_aluno_id,
  ta.status as turma_aluno_status,
  'UNIFICAR'::text as acao_sugerida
from pares p
join public.pessoas pessoa
  on pessoa.id = p.pessoa_id
join public.matricula_itens mi
  on mi.matricula_id in (p.matricula_ancora_sugerida, p.matricula_secundaria_sugerida)
left join public.turmas turma_inicial
  on turma_inicial.turma_id = mi.turma_id_inicial
left join lateral (
  select ta.*
  from public.turma_aluno ta
  where ta.matricula_item_id = mi.id
  order by case when ta.dt_fim is null then 0 else 1 end, ta.dt_inicio desc nulls last, ta.turma_aluno_id desc
  limit 1
) ta on true
left join public.turmas turma_atual
  on turma_atual.turma_id = ta.turma_id
order by pessoa.nome, papel_matricula, mi.id;

-- ============================================================
-- 3) FINANCEIRO RELACIONADO AO PAR
-- ============================================================
with pares(pessoa_id, matricula_ancora_sugerida, matricula_secundaria_sugerida) as (
  values
    (56, 2, 103),
    (76, 13, 31),
    (195, 25, 50),
    (159, 101, 119),
    (72, 46, 113),
    (105, 30, 67),
    (140, 19, 104),
    (157, 24, 56),
    (99, 22, 88),
    (184, 81, 106)
),
cobrancas_rel as (
  select
    p.pessoa_id,
    pessoa.nome,
    p.matricula_ancora_sugerida,
    p.matricula_secundaria_sugerida,
    case
      when c.origem_id = p.matricula_ancora_sugerida then 'PRINCIPAL'
      when c.origem_id = p.matricula_secundaria_sugerida then 'SECUNDARIA'
      else 'OUTRO'
    end as papel_matricula,
    c.id as cobranca_id,
    c.status,
    c.valor_centavos,
    c.vencimento,
    c.origem_tipo,
    c.origem_id,
    (select count(*) from public.recebimentos r where r.cobranca_id = c.id) as quantidade_recebimentos,
    (select coalesce(sum(r.valor_centavos), 0) from public.recebimentos r where r.cobranca_id = c.id) as total_recebido_centavos
  from pares p
  join public.pessoas pessoa
    on pessoa.id = p.pessoa_id
  join public.cobrancas c
    on c.origem_tipo = 'MATRICULA'
   and c.origem_id in (p.matricula_ancora_sugerida, p.matricula_secundaria_sugerida)
),
lancamentos_rel as (
  select
    p.pessoa_id,
    pessoa.nome,
    p.matricula_ancora_sugerida,
    p.matricula_secundaria_sugerida,
    case
      when l.matricula_id = p.matricula_ancora_sugerida then 'PRINCIPAL'
      when l.matricula_id = p.matricula_secundaria_sugerida then 'SECUNDARIA'
      else 'OUTRO'
    end as papel_matricula,
    l.id as lancamento_id,
    l.status,
    l.valor_centavos,
    l.competencia,
    l.referencia_item,
    l.matricula_id
  from pares p
  join public.pessoas pessoa
    on pessoa.id = p.pessoa_id
  join public.credito_conexao_lancamentos l
    on l.matricula_id in (p.matricula_ancora_sugerida, p.matricula_secundaria_sugerida)
)
select
  coalesce(c.pessoa_id, l.pessoa_id) as pessoa_id,
  coalesce(c.nome, l.nome) as nome,
  coalesce(c.matricula_ancora_sugerida, l.matricula_ancora_sugerida) as matricula_ancora_sugerida,
  coalesce(c.matricula_secundaria_sugerida, l.matricula_secundaria_sugerida) as matricula_secundaria_sugerida,
  coalesce(c.papel_matricula, l.papel_matricula) as papel_matricula,
  c.cobranca_id,
  c.status as cobranca_status,
  c.valor_centavos as cobranca_valor_centavos,
  c.vencimento,
  c.quantidade_recebimentos,
  c.total_recebido_centavos,
  l.lancamento_id,
  l.status as lancamento_status,
  l.valor_centavos as lancamento_valor_centavos,
  l.competencia,
  l.referencia_item,
  'UNIFICAR'::text as acao_sugerida
from cobrancas_rel c
full outer join lancamentos_rel l
  on l.pessoa_id = c.pessoa_id
 and l.papel_matricula = c.papel_matricula
 and l.lancamento_id::text = c.cobranca_id::text
order by nome, papel_matricula, cobranca_id nulls first, lancamento_id nulls first;
