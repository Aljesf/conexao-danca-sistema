begin;

-- 1) Conferência das contas internas reais do projeto (public.credito_conexao_contas).
select
  c.id as conta_interna_id,
  c.tipo_conta,
  c.pessoa_titular_id,
  c.responsavel_financeiro_pessoa_id,
  coalesce(c.responsavel_financeiro_pessoa_id, c.pessoa_titular_id) as pessoa_responsavel_sugerida,
  c.ativo,
  c.created_at
from public.credito_conexao_contas c
where c.tipo_conta = 'ALUNO'
order by c.id;

-- 2) Backfill seguro do responsável consolidado.
update public.credito_conexao_contas c
set
  responsavel_financeiro_pessoa_id = c.pessoa_titular_id,
  updated_at = now()
where c.tipo_conta = 'ALUNO'
  and c.responsavel_financeiro_pessoa_id is null
  and c.pessoa_titular_id is not null;

-- 3) Backfill seguro de aluno/matrícula nos lançamentos já existentes.
with candidatos as (
  select
    l.id as lancamento_id,
    coalesce(
      l.matricula_id,
      case
        when upper(coalesce(l.origem_sistema, '')) = 'MATRICULA'
         and l.origem_id is not null
        then l.origem_id
        else null
      end
    ) as matricula_id_sugerida
  from public.credito_conexao_lancamentos l
),
matriculas_resolvidas as (
  select
    c.lancamento_id,
    c.matricula_id_sugerida,
    m.pessoa_id as aluno_id_sugerido
  from candidatos c
  left join public.matriculas m
    on m.id = c.matricula_id_sugerida
)
update public.credito_conexao_lancamentos l
set
  matricula_id = coalesce(l.matricula_id, mr.matricula_id_sugerida),
  aluno_id = coalesce(l.aluno_id, mr.aluno_id_sugerido),
  updated_at = now()
from matriculas_resolvidas mr
where l.id = mr.lancamento_id
  and (
    (l.matricula_id is null and mr.matricula_id_sugerida is not null)
    or (l.aluno_id is null and mr.aluno_id_sugerido is not null)
  );

-- 4) Garantir 1 conta por responsável:
-- NÃO DELETAR NADA
-- Apenas identificar duplicadas
select
  coalesce(c.responsavel_financeiro_pessoa_id, c.pessoa_titular_id) as pessoa_responsavel_id,
  count(*) as quantidade_contas
from public.credito_conexao_contas c
where c.tipo_conta = 'ALUNO'
group by coalesce(c.responsavel_financeiro_pessoa_id, c.pessoa_titular_id)
having count(*) > 1;

-- 5) Conferência dos lançamentos ainda sem vínculo escolar resolvido.
select
  l.id,
  l.conta_conexao_id,
  l.origem_sistema,
  l.origem_id,
  l.aluno_id,
  l.matricula_id,
  l.descricao,
  l.competencia
from public.credito_conexao_lancamentos l
where l.aluno_id is null
   or l.matricula_id is null
order by l.id desc;

commit;
