-- ============================================
-- Curriculo - base minima (evita erros no curriculoServer)
-- ============================================

-- 1) Historico academico (formacoes internas)
CREATE TABLE IF NOT EXISTS public.historico_academico (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  turma_id BIGINT NULL,
  titulo TEXT NOT NULL,
  nivel TEXT NULL,
  ano_referencia INTEGER NULL,
  data_inicio DATE NULL,
  data_fim DATE NULL,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO', 'CONCLUIDO', 'NAO_CONCLUIDO', 'TRANCADO')),
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_academico_pessoa ON public.historico_academico(pessoa_id);

COMMENT ON TABLE public.historico_academico IS
'Formacoes internas do curriculo. Inicialmente manual; depois sera alimentado automaticamente ao concluir turmas/matriculas.';

-- 2) Formacoes externas (cursos externos + certificado opcional)
CREATE TABLE IF NOT EXISTS public.curriculo_formacoes_externas (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  nome_curso TEXT NOT NULL,
  organizacao TEXT NULL,
  local TEXT NULL,
  carga_horaria TEXT NULL,
  data_inicio DATE NULL,
  data_fim DATE NULL,
  certificado_url TEXT NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curriculo_formacoes_externas_pessoa ON public.curriculo_formacoes_externas(pessoa_id);

COMMENT ON TABLE public.curriculo_formacoes_externas IS
'Formacoes externas do curriculo (flexivel; nem todos os campos sao obrigatorios).';

-- 3) Experiencias artisticas (itens manuais)
CREATE TABLE IF NOT EXISTS public.curriculo_experiencias_artisticas (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  papel TEXT NULL,
  organizacao TEXT NULL,
  data_evento DATE NULL,
  descricao TEXT NULL,
  comprovante_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curriculo_experiencias_artisticas_pessoa ON public.curriculo_experiencias_artisticas(pessoa_id);

COMMENT ON TABLE public.curriculo_experiencias_artisticas IS
'Experiencias artisticas do curriculo (manual).';
