BEGIN;
-- =========================================
-- MIGRATION: Templates de Formulario por Blocos
-- =========================================
-- Objetivo:
-- - cabecalho/rodape por template (imagem + texto)
-- - blocos ordenaveis (pergunta / texto / imagem / divisor)

-- (A) Colunas no template (cabecalho/rodape + textos)
ALTER TABLE public.form_templates
  ADD COLUMN IF NOT EXISTS header_image_url text,
  ADD COLUMN IF NOT EXISTS footer_image_url text,
  ADD COLUMN IF NOT EXISTS intro_text_md text,
  ADD COLUMN IF NOT EXISTS outro_text_md text;
-- (B) Tabela de blocos (form builder)
CREATE TABLE IF NOT EXISTS public.form_template_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,

  -- Tipos suportados:
  -- PERGUNTA: referencia uma pergunta existente
  -- TEXTO: texto livre (markdown)
  -- IMAGEM: imagem no meio do formulario
  -- DIVISOR: separador visual
  tipo text NOT NULL CHECK (tipo IN ('PERGUNTA', 'TEXTO', 'IMAGEM', 'DIVISOR')),

  -- Para PERGUNTA:
  question_id uuid NULL REFERENCES public.form_questions(id) ON DELETE RESTRICT,

  -- Conteudo do bloco:
  titulo text NULL,
  texto_md text NULL,
  imagem_url text NULL,
  alinhamento text NULL CHECK (alinhamento IN ('ESQUERDA', 'CENTRO', 'DIREITA')),

  -- Regras do bloco
  obrigatoria boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_form_template_blocos_template_ordem
  ON public.form_template_blocos (template_id, ordem);
COMMIT;
