BEGIN;

-- Extensions (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_question_type') THEN
    CREATE TYPE public.form_question_type AS ENUM (
      'text',
      'textarea',
      'number',
      'date',
      'boolean',
      'single_choice',
      'multi_choice',
      'scale'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_template_status') THEN
    CREATE TYPE public.form_template_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

-- 2) Questions catalog
CREATE TABLE IF NOT EXISTS public.form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text NULL,
  tipo public.form_question_type NOT NULL,
  ajuda text NULL,
  placeholder text NULL,
  min_num numeric NULL,
  max_num numeric NULL,
  min_len int NULL,
  max_len int NULL,
  scale_min int NULL,
  scale_max int NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_form_questions_codigo UNIQUE (codigo)
);

-- 3) Question options (single_choice / multi_choice)
CREATE TABLE IF NOT EXISTS public.form_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
  valor text NOT NULL,
  rotulo text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_form_question_options UNIQUE (question_id, valor)
);

CREATE INDEX IF NOT EXISTS ix_form_question_options_question
  ON public.form_question_options (question_id);

-- 4) Form templates (by campaign)
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NULL,
  status public.form_template_status NOT NULL DEFAULT 'draft',
  versao int NOT NULL DEFAULT 1,
  published_at timestamptz NULL,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Template items
CREATE TABLE IF NOT EXISTS public.form_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.form_questions(id) ON DELETE RESTRICT,
  ordem int NOT NULL DEFAULT 0,
  obrigatoria boolean NOT NULL DEFAULT false,
  cond_question_id uuid NULL REFERENCES public.form_questions(id) ON DELETE RESTRICT,
  cond_equals_value text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_form_template_items UNIQUE (template_id, question_id)
);

CREATE INDEX IF NOT EXISTS ix_form_template_items_template
  ON public.form_template_items (template_id);

CREATE INDEX IF NOT EXISTS ix_form_template_items_question
  ON public.form_template_items (question_id);

-- 6) Submissions (one filled response)
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE RESTRICT,
  template_versao int NOT NULL DEFAULT 1,
  pessoa_id bigint NULL REFERENCES public.pessoas(id) ON DELETE SET NULL,
  responsavel_id bigint NULL REFERENCES public.pessoas(id) ON DELETE SET NULL,
  public_token text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_form_submissions_public_token UNIQUE (public_token)
);

CREATE INDEX IF NOT EXISTS ix_form_submissions_template
  ON public.form_submissions (template_id);

CREATE INDEX IF NOT EXISTS ix_form_submissions_pessoa
  ON public.form_submissions (pessoa_id);

-- 7) Answers (value + snapshot)
CREATE TABLE IF NOT EXISTS public.form_submission_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES public.form_template_items(id) ON DELETE RESTRICT,
  question_id uuid NOT NULL REFERENCES public.form_questions(id) ON DELETE RESTRICT,
  value_text text NULL,
  value_number numeric NULL,
  value_bool boolean NULL,
  value_date date NULL,
  value_json jsonb NULL,
  question_titulo_snapshot text NOT NULL,
  option_rotulos_snapshot text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_form_submission_answers UNIQUE (submission_id, template_item_id)
);

CREATE INDEX IF NOT EXISTS ix_form_submission_answers_submission
  ON public.form_submission_answers (submission_id);

CREATE INDEX IF NOT EXISTS ix_form_submission_answers_question
  ON public.form_submission_answers (question_id);

COMMIT;
