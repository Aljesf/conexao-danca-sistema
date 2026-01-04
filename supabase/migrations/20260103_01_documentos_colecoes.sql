-- =========================================================
-- DOCUMENTOS: Variaveis de Colecao (COLLECTION)
-- Data: 2026-01-03
-- =========================================================

-- 1) Catalogo de colecoes
create table if not exists public.documentos_colecoes (
  id bigserial primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,
  root_tipo text not null, -- ex.: MATRICULA, CREDITO_CONEXAO_FATURA
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Colunas (subcampos) de cada colecao
create table if not exists public.documentos_colecoes_colunas (
  id bigserial primary key,
  colecao_id bigint not null references public.documentos_colecoes(id) on delete cascade,
  codigo text not null, -- ex.: DATA, DESCRICAO, VALOR, STATUS
  label text not null, -- ex.: "Data", "Descricao", "Valor", "Status"
  tipo text not null, -- TEXTO | MONETARIO | DATA | NUMERICO | BOOLEANO
  formato text, -- BRL | DATA_CURTA | DATA_EXTENSO ...
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (colecao_id, codigo)
);

-- 3) Seeds iniciais (minimo viavel)
-- Colecao: lancamentos do Credito Conexao vinculados a matricula
insert into public.documentos_colecoes (codigo, nome, descricao, root_tipo, ordem)
values
  (
    'MATRICULA_LANCAMENTOS_CREDITO',
    'Matricula — Lancamentos (Credito Conexao)',
    'Lista lancamentos do Credito Conexao cujo origem_sistema=MATRICULA e origem_id=matricula_id',
    'MATRICULA',
    10
  ),
  (
    'FATURA_LANCAMENTOS_CREDITO',
    'Fatura — Lancamentos (Credito Conexao)',
    'Lista lancamentos vinculados a fatura do Credito Conexao',
    'CREDITO_CONEXAO_FATURA',
    20
  )
on conflict (codigo) do nothing;

-- Colunas para MATRICULA_LANCAMENTOS_CREDITO
with c as (
  select id from public.documentos_colecoes where codigo = 'MATRICULA_LANCAMENTOS_CREDITO'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem)
select
  c.id, v.codigo, v.label, v.tipo, v.formato, v.ordem
from c
cross join (values
  ('DATA', 'Data', 'DATA', 'DATA_CURTA', 10),
  ('DESCRICAO', 'Descricao', 'TEXTO', null, 20),
  ('VALOR', 'Valor', 'MONETARIO', 'BRL', 30),
  ('STATUS', 'Status', 'TEXTO', null, 40)
) as v(codigo, label, tipo, formato, ordem)
on conflict (colecao_id, codigo) do nothing;

-- Colunas para FATURA_LANCAMENTOS_CREDITO
with c as (
  select id from public.documentos_colecoes where codigo = 'FATURA_LANCAMENTOS_CREDITO'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem)
select
  c.id, v.codigo, v.label, v.tipo, v.formato, v.ordem
from c
cross join (values
  ('DATA', 'Data', 'DATA', 'DATA_CURTA', 10),
  ('DESCRICAO', 'Descricao', 'TEXTO', null, 20),
  ('VALOR', 'Valor', 'MONETARIO', 'BRL', 30),
  ('STATUS', 'Status', 'TEXTO', null, 40)
) as v(codigo, label, tipo, formato, ordem)
on conflict (colecao_id, codigo) do nothing;

-- 4) Indices auxiliares
create index if not exists documentos_colecoes_root_tipo_idx on public.documentos_colecoes(root_tipo);
create index if not exists documentos_colecoes_colunas_colecao_idx on public.documentos_colecoes_colunas(colecao_id);
