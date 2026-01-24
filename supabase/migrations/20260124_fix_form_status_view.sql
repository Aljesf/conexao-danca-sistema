-- View canonical: operational status for form submissions
create or replace view public.form_submissions_status_v as
with required as (
  select
    s.id as submission_id,
    count(*)::int as required_count
  from public.form_submissions s
  join public.form_template_items ti
    on ti.template_id = s.template_id
  where
    ti.obrigatoria is true
  group by s.id
),
answered as (
  select
    a.submission_id,
    count(*)::int as answered_count
  from public.form_submission_answers a
  group by a.submission_id
)
select
  s.*,
  coalesce(req.required_count, 0) as required_count,
  coalesce(ans.answered_count, 0) as answered_count,
  case
    when coalesce(ans.answered_count, 0) = 0 then 'PENDENTE'
    when coalesce(req.required_count, 0) > 0
         and coalesce(ans.answered_count, 0) >= coalesce(req.required_count, 0) then 'CONCLUIDO'
    else 'EM_ANDAMENTO'
  end as status_operacional
from public.form_submissions s
left join required req on req.submission_id = s.id
left join answered ans on ans.submission_id = s.id;

comment on view public.form_submissions_status_v is
'Canonical operational status for submissions: PENDENTE/EM_ANDAMENTO/CONCLUIDO derived from answers and template.';
