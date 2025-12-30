-- 1) Enum de contexto (simples via CHECK para flexibilidade)
-- Vamos usar text[] para permitir multiplos contextos por centro de custo.

alter table public.centros_custo
  add column if not exists contextos_aplicaveis text[] not null default '{}'::text[];

-- 2) Seed minimo (sem sobrescrever quem ja tem)
-- Regra: se vazio, define defaults com base no nome (heuristica leve).
-- Ajuste os nomes se os seus centros tiverem outro padrao.

update public.centros_custo
set contextos_aplicaveis = array['ADMIN','ESCOLA']
where (contextos_aplicaveis is null or array_length(contextos_aplicaveis, 1) is null)
  and (lower(nome) like '%escola%' or lower(nome) like '%conexao danca%');

update public.centros_custo
set contextos_aplicaveis = array['ADMIN','LOJA']
where (contextos_aplicaveis is null or array_length(contextos_aplicaveis, 1) is null)
  and (lower(nome) like '%loja%' or lower(nome) like '%aj dance%');

update public.centros_custo
set contextos_aplicaveis = array['ADMIN','CAFE']
where (contextos_aplicaveis is null or array_length(contextos_aplicaveis, 1) is null)
  and (lower(nome) like '%cafe%');

update public.centros_custo
set contextos_aplicaveis = array['ADMIN']
where (contextos_aplicaveis is null or array_length(contextos_aplicaveis, 1) is null)
  and (lower(nome) like '%intermedia%' or lower(nome) like '%intermediacao%');

create index if not exists idx_centros_custo_contextos_gin
  on public.centros_custo using gin (contextos_aplicaveis);

select pg_notify('pgrst', 'reload schema');
