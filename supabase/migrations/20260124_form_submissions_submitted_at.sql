alter table public.form_submissions
  add column if not exists submitted_at timestamp with time zone null;

alter table public.form_submissions
  alter column submitted_at drop not null;

alter table public.form_submissions
  alter column submitted_at drop default;

comment on column public.form_submissions.submitted_at is
'Post-final-submit timestamp. CONCLUIDO = submitted_at IS NOT NULL.';
