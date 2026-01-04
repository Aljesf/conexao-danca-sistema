-- Colecoes novas baseadas no ledger da matricula

insert into public.documentos_colecoes (codigo, nome, descricao, root_tipo, ordem)
values
  ('MATRICULA_ENTRADAS', 'Matrícula — Entradas', 'Entradas / pró-rata fora do cartão vinculadas à matrícula', 'MATRICULA', 11),
  ('MATRICULA_PARCELAS', 'Matrícula — Parcelas', 'Parcelas/mensalidades vinculadas à matrícula', 'MATRICULA', 12)
on conflict (codigo) do nothing;

with c as (
  select id from public.documentos_colecoes where codigo = 'MATRICULA_ENTRADAS'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem)
select
  c.id, v.codigo, v.label, v.tipo, v.formato, v.ordem
from c
cross join (values
  ('DATA', 'Data', 'DATA', 'DATA_CURTA', 10),
  ('DESCRICAO', 'Descrição', 'TEXTO', null, 20),
  ('VALOR', 'Valor', 'MONETARIO', 'BRL', 30),
  ('STATUS', 'Status', 'TEXTO', null, 40)
) as v(codigo, label, tipo, formato, ordem)
on conflict (colecao_id, codigo) do nothing;

with c as (
  select id from public.documentos_colecoes where codigo = 'MATRICULA_PARCELAS'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem)
select
  c.id, v.codigo, v.label, v.tipo, v.formato, v.ordem
from c
cross join (values
  ('VENCIMENTO', 'Vencimento', 'DATA', 'DATA_CURTA', 10),
  ('DESCRICAO', 'Descrição', 'TEXTO', null, 20),
  ('VALOR', 'Valor', 'MONETARIO', 'BRL', 30),
  ('STATUS', 'Status', 'TEXTO', null, 40)
) as v(codigo, label, tipo, formato, ordem)
on conflict (colecao_id, codigo) do nothing;
