create table if not exists public.matriculas_compromissos_previstos (
  id bigserial primary key,
  contexto_matricula_id bigint not null references public.escola_contextos_matricula(id),
  aluno_pessoa_id bigint not null references public.pessoas(id),
  total_anual_previsto_centavos integer not null,
  total_mensal_previsto_centavos integer not null,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
