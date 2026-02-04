-- 1) Campo de revisao manual (auditavel)
alter table public.form_submissions
  add column if not exists review_status text null,
  add column if not exists reviewed_at timestamp with time zone null,
  add column if not exists reviewed_by uuid null,
  add column if not exists review_note text null;

-- 2) CHECK de valores permitidos (simples e flexivel)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_form_submissions_review_status'
  ) then
    alter table public.form_submissions
      add constraint ck_form_submissions_review_status
      check (review_status is null or review_status in (
        'PENDENTE_REVISAO',
        'OK',
        'AJUSTE_SOLICITADO',
        'INVALIDADO'
      ));
  end if;
end $$;

comment on column public.form_submissions.review_status is
'Revisao manual (auditavel). Quando preenchido, deve ter reviewed_at e reviewed_by.';
comment on column public.form_submissions.review_note is
'Nota opcional do operador (ex.: o que faltou / motivo do ajuste).';

-- 3) Indice para filtros
create index if not exists ix_form_submissions_review_status
on public.form_submissions (review_status);
