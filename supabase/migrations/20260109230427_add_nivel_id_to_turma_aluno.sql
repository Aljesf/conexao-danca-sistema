-- [INICIO DO BLOCO] supabase/migrations/20260109230427_add_nivel_id_to_turma_aluno.sql

-- 1) Adiciona coluna para registrar o nivel cursado na turma
ALTER TABLE public.turma_aluno
ADD COLUMN IF NOT EXISTS nivel_id bigint NULL;
-- 2) FK para niveis (ajuste o nome da PK/coluna se seu schema for diferente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'turma_aluno_nivel_id_fkey'
  ) THEN
    ALTER TABLE public.turma_aluno
    ADD CONSTRAINT turma_aluno_nivel_id_fkey
    FOREIGN KEY (nivel_id) REFERENCES public.niveis(id)
    ON DELETE SET NULL;
  END IF;
END$$;
-- 3) Indice para performance
CREATE INDEX IF NOT EXISTS idx_turma_aluno_nivel_id
ON public.turma_aluno(nivel_id);
-- [FIM DO BLOCO];
