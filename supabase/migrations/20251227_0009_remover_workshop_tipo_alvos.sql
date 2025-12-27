-- Conexao Danca -- Matriculas
-- Remover WORKSHOP como alvo_tipo (workshop e modalidade de CURSO_LIVRE)
-- Encoding: UTF-8 (sem BOM)

BEGIN;

-- 1) Migrar dados existentes de WORKSHOP -> CURSO_LIVRE
UPDATE public.matricula_tabelas_alvos
SET alvo_tipo = 'CURSO_LIVRE'
WHERE alvo_tipo = 'WORKSHOP';

-- 2) Recriar constraint chk sem WORKSHOP
ALTER TABLE public.matricula_tabelas_alvos
  DROP CONSTRAINT IF EXISTS chk_matricula_tabelas_alvos_tipo;

ALTER TABLE public.matricula_tabelas_alvos
  ADD CONSTRAINT chk_matricula_tabelas_alvos_tipo
  CHECK (alvo_tipo IN ('TURMA','CURSO_LIVRE','PROJETO'));

COMMIT;
