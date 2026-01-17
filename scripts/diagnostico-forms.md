Diagnostico — Modulo Forms (Templates / Questions / Links / Respostas)

A) SQL (Supabase)

Migrations/localizacao:
- supabase/migrations/20260115_230000_form_builder_mvp.sql
- supabase/migrations/20260116_000100_seed_ase_templates.sql (seed de perguntas/templates)
- schema-supabase.sql: nenhum match para tabelas/enums de forms.

Enums encontrados:
- public.form_question_type: text, textarea, number, date, boolean, single_choice, multi_choice, scale
- public.form_template_status: draft, published, archived

Tabelas encontradas:
- public.form_questions
- public.form_question_options
- public.form_templates
- public.form_template_items
- public.form_submissions
- public.form_submission_answers

Relacoes (FKs) principais:
- form_question_options.question_id -> form_questions.id (ON DELETE CASCADE)
- form_template_items.template_id -> form_templates.id (ON DELETE CASCADE)
- form_template_items.question_id -> form_questions.id (ON DELETE RESTRICT)
- form_template_items.cond_question_id -> form_questions.id (ON DELETE RESTRICT)
- form_submissions.template_id -> form_templates.id (ON DELETE RESTRICT)
- form_submissions.pessoa_id -> pessoas.id (ON DELETE SET NULL)
- form_submissions.responsavel_id -> pessoas.id (ON DELETE SET NULL)
- form_submission_answers.submission_id -> form_submissions.id (ON DELETE CASCADE)
- form_submission_answers.template_item_id -> form_template_items.id (ON DELETE RESTRICT)
- form_submission_answers.question_id -> form_questions.id (ON DELETE RESTRICT)

B) APIs (Next.js routes)

Rotas admin/forms/templates:
- GET /api/admin/forms/templates
  - src/app/api/admin/forms/templates/route.ts
  - Retorno: { data: Template[] } ou { error }
- POST /api/admin/forms/templates
  - src/app/api/admin/forms/templates/route.ts
  - Payload: { nome, descricao? }
  - Retorno: { data: Template } (201) ou { error }
- GET /api/admin/forms/templates/[id]
  - src/app/api/admin/forms/templates/[id]/route.ts
  - Retorno: { data: { template, items } } ou { error }
  - items inclui join com form_questions + form_question_options
- PATCH /api/admin/forms/templates/[id]
  - src/app/api/admin/forms/templates/[id]/route.ts
  - Payload: { nome?, descricao? }
  - Retorno: { data } ou { error }
- PUT /api/admin/forms/templates/[id]/items
  - src/app/api/admin/forms/templates/[id]/items/route.ts
  - Payload: { items: [{ question_id, ordem, obrigatoria, cond_question_id?, cond_equals_value? }] }
  - Logica: apaga itens do template e insere lista enviada
  - Retorno: { data: [{ id }] } ou { error }
- POST /api/admin/forms/templates/[id]/status
  - src/app/api/admin/forms/templates/[id]/status/route.ts
  - Payload: { status: draft|published|archived }
  - Ajusta published_at/archived_at
- POST /api/admin/forms/templates/[id]/generate-link
  - src/app/api/admin/forms/templates/[id]/generate-link/route.ts
  - Payload: { pessoa_id?, responsavel_id? }
  - Regras: template precisa estar published
  - Retorno: { data: { submission_id, public_token, public_url } } ou { error }

Rotas admin/forms/questions:
- GET /api/admin/forms/questions
  - src/app/api/admin/forms/questions/route.ts
  - Retorno: { data: form_questions + form_question_options } ou { error }
- POST /api/admin/forms/questions
  - src/app/api/admin/forms/questions/route.ts
  - Payload obrigatorio: { codigo, titulo, tipo }
  - Payload opcional: { descricao, ajuda, placeholder, ativo, min_num, max_num, min_len, max_len, scale_min, scale_max }
  - Retorno: { data } (201) ou { error }

Rotas publicas (link/resposta):
- GET /api/public/forms/[token]
  - src/app/api/public/forms/[token]/route.ts
  - Valida public_token em form_submissions e template published
  - Retorno: { data: { submission, template, items } } ou { error }
- POST /api/public/forms/[token]
  - src/app/api/public/forms/[token]/route.ts
  - Payload: { answers: [{ template_item_id, question_id, question_titulo_snapshot, value_text?, value_number?, value_bool?, value_date?, value_json?, option_rotulos_snapshot? }] }
  - Retorno: { ok: true } ou { error }

Observacoes de uso em outros modulos:
- src/app/api/admin/movimento/beneficiarios/route.ts consulta form_templates/form_submissions para exigir ASE submetida.

C) Paginas (Admin e Publico)

/admin/forms/templates (lista):
- src/app/(private)/admin/forms/templates/page.tsx

/admin/forms/templates/new (novo):
- src/app/(private)/admin/forms/templates/new/page.tsx

/admin/forms/templates/[id] (editor):
- src/app/(private)/admin/forms/templates/[id]/page.tsx
  - Busca templates + perguntas; salva itens via /items; status via /status; gera link via /generate-link

/admin/forms/questions (banco de perguntas):
- src/app/(private)/admin/forms/questions/page.tsx
  - Placeholder/MVP sem CRUD visual

Paginas publicas:
- /public/forms/[token]
  - src/app/public/forms/[token]/page.tsx

Componentes correlatos:
- src/components/pessoas/FormulariosInternosCard.tsx (gera link publico para pessoa/responsavel)

D) Respostas/Submissoes

Tabelas:
- form_submissions
- form_submission_answers

Rotas:
- POST /api/public/forms/[token] grava respostas em form_submission_answers
- POST /api/admin/forms/templates/[id]/generate-link cria form_submissions

Status: ENCONTRADO

E) Checklist para execucao (proxima etapa)

- Refatorar /admin/forms/questions para CRUD completo (inclui options)
- Ajustar editor de template para cond_question_id / cond_equals_value (UI e validacoes)
- (Opcional) Implementar/listar links gerados e respostas (relatorios / historico de submissoes)