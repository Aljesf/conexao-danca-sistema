-- Observacao: ajuste o prefixo/data conforme seu padrao de migrations.

BEGIN;

-- 1) Cabecalho de respostas
CREATE TABLE IF NOT EXISTS public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  pessoa_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'COMPLETO',
  started_at timestamptz NULL,
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT form_responses_template_fkey
    FOREIGN KEY (template_id) REFERENCES public.form_templates (id)
    ON DELETE CASCADE,

  CONSTRAINT form_responses_pessoa_fkey
    FOREIGN KEY (pessoa_id) REFERENCES public.pessoas (id)
    ON DELETE RESTRICT
);

-- Evita duplicidade simples (1 resposta por template por pessoa).
-- Se no futuro voce quiser permitir multiplas respostas, a gente remove/ajusta essa constraint.
CREATE UNIQUE INDEX IF NOT EXISTS ux_form_responses_template_pessoa
  ON public.form_responses (template_id, pessoa_id);

CREATE INDEX IF NOT EXISTS ix_form_responses_template
  ON public.form_responses (template_id);

CREATE INDEX IF NOT EXISTS ix_form_responses_pessoa
  ON public.form_responses (pessoa_id);

CREATE INDEX IF NOT EXISTS ix_form_responses_submitted_at
  ON public.form_responses (submitted_at);

-- 2) Respostas por pergunta (armazenamento normalizado)
CREATE TABLE IF NOT EXISTS public.form_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  question_id uuid NOT NULL,

  -- Valores possiveis (um deles por tipo, conforme form_questions.tipo)
  valor_texto text NULL,
  valor_numero numeric NULL,
  valor_boolean boolean NULL,
  valor_data date NULL,

  -- Para escolha unica (salva o "valor" da opcao)
  valor_opcao text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT form_response_answers_response_fkey
    FOREIGN KEY (response_id) REFERENCES public.form_responses (id)
    ON DELETE CASCADE,

  CONSTRAINT form_response_answers_question_fkey
    FOREIGN KEY (question_id) REFERENCES public.form_questions (id)
    ON DELETE RESTRICT
);

-- 1 resposta por pergunta por response
CREATE UNIQUE INDEX IF NOT EXISTS ux_form_response_answers_response_question
  ON public.form_response_answers (response_id, question_id);

CREATE INDEX IF NOT EXISTS ix_form_response_answers_response
  ON public.form_response_answers (response_id);

CREATE INDEX IF NOT EXISTS ix_form_response_answers_question
  ON public.form_response_answers (question_id);

-- 3) Multipla escolha (N:N)
CREATE TABLE IF NOT EXISTS public.form_response_selected_options (
  response_answer_id uuid NOT NULL,
  option_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT form_response_selected_options_pkey PRIMARY KEY (response_answer_id, option_id),

  CONSTRAINT form_response_selected_options_answer_fkey
    FOREIGN KEY (response_answer_id) REFERENCES public.form_response_answers (id)
    ON DELETE CASCADE,

  CONSTRAINT form_response_selected_options_option_fkey
    FOREIGN KEY (option_id) REFERENCES public.form_question_options (id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_form_response_selected_options_answer
  ON public.form_response_selected_options (response_answer_id);

COMMIT;
