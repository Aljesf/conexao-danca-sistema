begin;

alter table public.eventos_escola_inscricoes
  add column if not exists participante_nome_snapshot text null,
  add column if not exists quantidade_parcelas_conta_interna integer not null default 1;

update public.eventos_escola_inscricoes as inscricao
set participante_nome_snapshot = coalesce(
  inscricao.participante_nome_snapshot,
  (
    select pessoa_aluno.nome
    from public.pessoas as pessoa_aluno
    where pessoa_aluno.id = inscricao.aluno_pessoa_id
  ),
  (
    select pessoa_principal.nome
    from public.pessoas as pessoa_principal
    where pessoa_principal.id = inscricao.pessoa_id
  ),
  'Pessoa #' || inscricao.pessoa_id::text
)
where inscricao.participante_nome_snapshot is null;

alter table public.eventos_escola_edicao_configuracoes
  add column if not exists permite_parcelamento_conta_interna boolean not null default false,
  add column if not exists maximo_parcelas_conta_interna integer not null default 1,
  add column if not exists competencias_elegiveis_conta_interna jsonb not null default '[]'::jsonb,
  add column if not exists permite_competencias_apos_evento boolean not null default false,
  add column if not exists dia_corte_operacional_parcelamento integer null;

update public.eventos_escola_edicao_configuracoes
set
  permite_parcelamento_conta_interna = coalesce(
    permite_parcelamento_conta_interna,
    modo_cobranca = 'PARCELADA' and quantidade_maxima_parcelas > 1
  ),
  maximo_parcelas_conta_interna = greatest(
    coalesce(nullif(maximo_parcelas_conta_interna, 0), quantidade_maxima_parcelas, 1),
    1
  ),
  competencias_elegiveis_conta_interna = coalesce(
    competencias_elegiveis_conta_interna,
    '[]'::jsonb
  ),
  permite_competencias_apos_evento = coalesce(
    permite_competencias_apos_evento,
    false
  )
where true;

create table if not exists public.eventos_escola_inscricao_parcelas_conta_interna (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references public.eventos_escola_inscricoes(id) on delete cascade,
  parcela_numero integer not null,
  total_parcelas integer not null,
  competencia text not null,
  valor_centavos integer not null default 0,
  conta_interna_id bigint not null references public.credito_conexao_contas(id),
  cobranca_id bigint null references public.cobrancas(id) on delete set null,
  lancamento_conta_interna_id bigint null references public.credito_conexao_lancamentos(id) on delete set null,
  fatura_conta_interna_id bigint null references public.credito_conexao_faturas(id) on delete set null,
  status text not null default 'PENDENTE',
  observacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists eventos_escola_inscricao_parcelas_conta_interna_parcela_uidx
  on public.eventos_escola_inscricao_parcelas_conta_interna (inscricao_id, parcela_numero);

create unique index if not exists eventos_escola_inscricao_parcelas_conta_interna_competencia_uidx
  on public.eventos_escola_inscricao_parcelas_conta_interna (inscricao_id, competencia);

create index if not exists eventos_escola_inscricao_parcelas_conta_interna_conta_idx
  on public.eventos_escola_inscricao_parcelas_conta_interna (conta_interna_id, competencia);

insert into public.eventos_escola_inscricao_parcelas_conta_interna (
  inscricao_id,
  parcela_numero,
  total_parcelas,
  competencia,
  valor_centavos,
  conta_interna_id,
  cobranca_id,
  lancamento_conta_interna_id,
  fatura_conta_interna_id,
  status,
  observacoes
)
select
  inscricao.id,
  1 as parcela_numero,
  greatest(coalesce(inscricao.quantidade_parcelas_conta_interna, 1), 1) as total_parcelas,
  coalesce(
    lancamento.competencia,
    cobranca.competencia_ano_mes,
    to_char(coalesce(inscricao.created_at::date, current_date), 'YYYY-MM')
  ) as competencia,
  coalesce(inscricao.valor_total_centavos, 0) as valor_centavos,
  inscricao.conta_interna_id,
  inscricao.cobranca_id,
  inscricao.lancamento_conta_interna_id,
  inscricao.fatura_conta_interna_id,
  case
    when inscricao.status_financeiro = 'PAGO' then 'PAGO'
    when inscricao.status_financeiro = 'CANCELADO' then 'CANCELADO'
    else 'PENDENTE'
  end as status,
  'Backfill inicial da distribuicao por competencia da inscricao.' as observacoes
from public.eventos_escola_inscricoes as inscricao
left join public.credito_conexao_lancamentos as lancamento
  on lancamento.id = inscricao.lancamento_conta_interna_id
left join public.cobrancas as cobranca
  on cobranca.id = inscricao.cobranca_id
where inscricao.conta_interna_id is not null
  and not exists (
    select 1
    from public.eventos_escola_inscricao_parcelas_conta_interna as parcela
    where parcela.inscricao_id = inscricao.id
  );

comment on column public.eventos_escola_inscricoes.participante_nome_snapshot is
  'Snapshot do nome do participante na inscricao para preservar identidade visual e historico mesmo apos cancelamentos ou mudancas cadastrais.';

comment on column public.eventos_escola_edicao_configuracoes.competencias_elegiveis_conta_interna is
  'Lista explicita de competencias YYYY-MM elegiveis para parcelamento da inscricao em conta interna nesta edicao.';

comment on table public.eventos_escola_inscricao_parcelas_conta_interna is
  'Distribuicao da inscricao da edicao por competencia da conta interna, vinculando as cobrancas, lancamentos e faturas oficiais do sistema.';

commit;
