-- (A) Matriculas que exigem vinculo e nao tem vinculo
select
  m.id as matricula_id,
  m.responsavel_financeiro_id,
  pr.nome as responsavel_nome,
  m.pessoa_id as dependente_id,
  pd.nome as dependente_nome
from public.matriculas m
join public.pessoas pr on pr.id = m.responsavel_financeiro_id
join public.pessoas pd on pd.id = m.pessoa_id
left join public.pessoa_responsavel_financeiro_vinculos v
  on v.responsavel_pessoa_id = m.responsavel_financeiro_id
 and v.dependente_pessoa_id = m.pessoa_id
where
  m.responsavel_financeiro_id is not null
  and m.pessoa_id is not null
  and m.responsavel_financeiro_id <> m.pessoa_id
  and v.id is null
order by pr.nome, pd.nome;

-- (B) Dependentes por responsavel (ja na view)
select *
from public.vw_responsavel_financeiro_dependentes
where responsavel_pessoa_id = 107
order by dependente_nome;

-- (C) Responsaveis por dependente
select *
from public.vw_dependente_financeiro_responsaveis
where dependente_pessoa_id in (108, 109)
order by responsavel_nome;
