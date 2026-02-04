drop view if exists public.form_submissions_status_v;

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

  -- Status automatico minimo (nao depende de submitted_at)
  case
    when coalesce(ans.answered_count, 0) = 0 then 'NAO_INICIOU'
    else 'EM_ANDAMENTO'
  end as status_auto,

  -- Status final (prioriza revisao manual quando existe)
  case
    when s.review_status = 'OK' then 'CONCLUIDO'
    when s.review_status = 'AJUSTE_SOLICITADO' then 'AJUSTE_SOLICITADO'
    when s.review_status = 'INVALIDADO' then 'INVALIDADO'
    when s.review_status = 'PENDENTE_REVISAO' then 'PENDENTE_REVISAO'
    else
      case
        when coalesce(ans.answered_count, 0) = 0 then 'NAO_INICIOU'
        else 'EM_ANDAMENTO'
      end
  end as status_final

from public.form_submissions s
left join answered ans on ans.submission_id = s.id;

comment on view public.form_submissions_status_v is
'Status de formularios: status_auto (metrica) + review_status (manual) + status_final (prioriza manual).';
