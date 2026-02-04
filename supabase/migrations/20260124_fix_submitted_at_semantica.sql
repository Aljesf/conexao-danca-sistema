-- 1) Garantir default nulo (documentacao/clareza; por padrao ja e NULL, mas deixamos explicito)
alter table public.form_submissions
  alter column submitted_at drop default;

comment on column public.form_submissions.submitted_at is
'Timestamp do envio final. Deve ser preenchido SOMENTE no clique final em "Enviar".';

-- 2) Corrigir dados ja marcados como concluidos indevidamente:
-- Heuristica segura: se NAO existem answers, nao pode estar enviado.
update public.form_submissions s
set submitted_at = null
where s.submitted_at is not null
  and not exists (
    select 1
    from public.form_submission_answers a
    where a.submission_id = s.id
  );
