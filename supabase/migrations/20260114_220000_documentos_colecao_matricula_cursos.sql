begin;

-- 1) Colecao: cursos/turmas vinculados a matricula
insert into public.documentos_colecoes (codigo, nome, descricao, root_tipo, ordem, ativo)
values
  (
    'MATRICULA_CURSOS',
    'Cursos/Turmas da Matricula',
    'Lista de turmas/cursos vinculados a matricula (turma_aluno + turmas).',
    'MATRICULA',
    13,
    true
  )
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    root_tipo = excluded.root_tipo,
    ordem = excluded.ordem,
    ativo = excluded.ativo;

-- 2) Colunas da colecao
with c as (
  select id from public.documentos_colecoes where codigo = 'MATRICULA_CURSOS'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem, ativo)
select
  c.id,
  v.codigo,
  v.label,
  v.tipo,
  v.formato,
  v.ordem,
  v.ativo
from c
cross join (values
  ('CURSO_NOME', 'Curso/Turma', 'TEXTO', null, 10, true),
  ('MODALIDADE', 'Modalidade', 'TEXTO', null, 20, true),
  ('NIVEL', 'Nivel', 'TEXTO', null, 30, true),
  ('TURNO', 'Turno', 'TEXTO', null, 40, true),
  ('CARGA_HORARIA', 'Carga horaria', 'TEXTO', null, 50, true),
  ('STATUS', 'Status', 'TEXTO', null, 60, true),
  ('TURMA_ID', 'ID Turma', 'TEXTO', null, 70, false)
) as v(codigo, label, tipo, formato, ordem, ativo)
on conflict (colecao_id, codigo) do update
set label = excluded.label,
    tipo = excluded.tipo,
    formato = excluded.formato,
    ordem = excluded.ordem,
    ativo = excluded.ativo;

select pg_notify('pgrst', 'reload schema');

commit;
