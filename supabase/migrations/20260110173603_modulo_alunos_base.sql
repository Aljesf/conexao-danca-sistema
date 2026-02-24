-- [INICIO DO BLOCO] supabase/migrations/<timestamp>_modulo_alunos_base.sql

-- 1) Curriculo institucional (aluno e nao-aluno)
CREATE TABLE IF NOT EXISTS public.curriculos_institucionais (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_curriculo TEXT NOT NULL CHECK (tipo_curriculo IN ('ACADEMICO', 'INSTITUCIONAL')),
  habilitado BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id)
);
COMMENT ON TABLE public.curriculos_institucionais IS
'Habilita curriculo academico (aluno) ou institucional (nao-aluno) para pessoas.';
-- 2) Grupos administrativos de alunos
CREATE TABLE IF NOT EXISTS public.aluno_grupos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('TEMPORARIO', 'DURADOURO')),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.aluno_grupos IS
'Agrupamentos administrativos manuais de alunos (nao pedagogicos).';
CREATE TABLE IF NOT EXISTS public.aluno_grupo_membros (
  id BIGSERIAL PRIMARY KEY,
  grupo_id BIGINT NOT NULL REFERENCES public.aluno_grupos(id) ON DELETE CASCADE,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  data_saida DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, pessoa_id)
);
COMMENT ON TABLE public.aluno_grupo_membros IS
'Vinculo entre grupos administrativos e pessoas (alunos).';
-- 3) View canonica - lista de alunos
CREATE OR REPLACE VIEW public.vw_alunos_canonico AS
SELECT DISTINCT
  p.id AS pessoa_id,
  p.nome,
  p.email,
  p.telefone,
  p.ativo
FROM public.pessoas p
JOIN public.pessoas_roles pr
  ON pr.pessoa_id = p.id
  AND pr.role = 'ALUNO'
WHERE p.ativo = true;
COMMENT ON VIEW public.vw_alunos_canonico IS
'View canônica de alunos baseada em role ALUNO. Não depende de campos legados opcionais.';
-- [FIM DO BLOCO];
