-- Migração radical: remover o conceito de modalidade e substituir por curso
-- Executar em ambiente de testes; pode ser destrutiva

-- Renomeia tabela principal (caso exista)
ALTER TABLE IF EXISTS modalidades RENAME TO cursos;

-- Ajusta colunas de referência em tabelas relacionadas
ALTER TABLE IF EXISTS niveis
  RENAME COLUMN modalidade_id TO curso_id;

ALTER TABLE IF EXISTS turmas
  RENAME COLUMN modalidade TO curso;

ALTER TABLE IF EXISTS modulos
  RENAME COLUMN modalidade_id TO curso_id;

ALTER TABLE IF EXISTS habilidades
  RENAME COLUMN modalidade_id TO curso_id;

-- Ajusta chaves estrangeiras simples (remova se não existirem)
ALTER TABLE IF EXISTS niveis
  DROP CONSTRAINT IF EXISTS niveis_modalidade_id_fkey;

ALTER TABLE IF EXISTS modulos
  DROP CONSTRAINT IF EXISTS modulos_modalidade_id_fkey;

ALTER TABLE IF EXISTS habilidades
  DROP CONSTRAINT IF EXISTS habilidades_modalidade_id_fkey;

-- Recria fkeys usando curso_id
ALTER TABLE IF EXISTS niveis
  ADD CONSTRAINT niveis_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS modulos
  ADD CONSTRAINT modulos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS habilidades
  ADD CONSTRAINT habilidades_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE;
