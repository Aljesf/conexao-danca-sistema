-- 1) Recriar a view do zero (evita erro 42P16 ao tentar mudar assinatura via OR REPLACE)
drop view if exists public.form_submissions_status_v;

-- 2) Criar novamente com a assinatura final
create view public.form_submissions_status_v as
with answered as (
  select
    a.submission_id,
    count(*)::int as answered_count
  from public.form_submission_answers a
  group by a.submission_id
)
select
  s.*,
  coalesce(ans.answered_count, 0) as answered_count,
  case
    when s.submitted_at is not null then 'CONCLUIDO'
    when coalesce(ans.answered_count, 0) = 0 then 'ENVIADO'
    else 'EM_ANDAMENTO'
  end as status_operacional
from public.form_submissions s
left join answered ans on ans.submission_id = s.id;

comment on view public.form_submissions_status_v is
'Status operacional canonico por evento: ENVIADO (0 respostas), EM_ANDAMENTO (>0 e sem submit), CONCLUIDO (submitted_at preenchido).';
