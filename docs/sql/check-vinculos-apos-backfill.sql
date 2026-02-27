-- Quantos vinculos existem
select count(*) as total_vinculos
from public.pessoa_responsavel_financeiro_vinculos;

-- Responsavel 107 deve listar dependentes (ex.: 108 e 109)
select *
from public.vw_responsavel_financeiro_dependentes
where responsavel_pessoa_id = 107
order by dependente_nome;

-- O par citado no erro deve existir so 1 vez
select *
from public.pessoa_responsavel_financeiro_vinculos
where responsavel_pessoa_id = 104 and dependente_pessoa_id = 105;
