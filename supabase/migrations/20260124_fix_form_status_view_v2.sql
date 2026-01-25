-- View canonica: status operacional + contagens consistentes
create or replace view public.form_submissions_status_v as
with template_items as (
  select
    ti.id as template_item_id,
    ti.template_id,
    coalesce(ti.obrigatoria, true) as obrigatorio
  from public.form_template_items ti
),
counts as (
  select
    s.id as submission_id,
    s.template_id,
    (select count(*)::int
     from template_items ti
     where ti.template_id = s.template_id) as total_count,
    (select count(*)::int
     from template_items ti
     where ti.template_id = s.template_id
       and ti.obrigatorio = true) as required_count
  from public.form_submissions s
),
answered as (
  select
    a.submission_id,
    count(*)::int as answered_count
  from public.form_submission_answers a
  group by a.submission_id
),
answered_required as (
  select
    a.submission_id,
    count(*)::int as answered_required_count
  from public.form_submission_answers a
  join public.form_submissions s on s.id = a.submission_id
  join template_items ti
    on ti.template_id = s.template_id
   and ti.template_item_id = a.template_item_id
  where ti.obrigatorio = true
  group by a.submission_id
)
select
  s.*,
  coalesce(c.total_count, 0) as total_count,
  coalesce(c.required_count, 0) as required_count,
  coalesce(ans.answered_count, 0) as answered_count,
  coalesce(ar.answered_required_count, 0) as answered_required_count,
  case
    when coalesce(ans.answered_count, 0) = 0 then 'PENDENTE'
    when coalesce(c.required_count, 0) > 0
         and coalesce(ar.answered_required_count, 0) >= coalesce(c.required_count, 0) then 'CONCLUIDO'
    else 'EM_ANDAMENTO'
  end as status_operacional
from public.form_submissions s
left join counts c on c.submission_id = s.id
left join answered ans on ans.submission_id = s.id
left join answered_required ar on ar.submission_id = s.id;

comment on view public.form_submissions_status_v is
'Status operacional canonico (PENDENTE/EM_ANDAMENTO/CONCLUIDO) + contagens: total_count/required_count/answered_count/answered_required_count.';
