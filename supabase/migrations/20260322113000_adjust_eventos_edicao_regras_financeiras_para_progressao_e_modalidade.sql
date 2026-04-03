begin;

create table if not exists public.eventos_escola_edicao_regras_financeiras (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.eventos_escola_edicoes(id) on delete cascade,
  tipo_regra text not null
    check (tipo_regra in (
      'TAXA_GERAL',
      'POR_FORMACAO',
      'POR_MODALIDADE',
      'POR_PROGRESSAO',
      'POR_QUANTIDADE',
      'ITEM_ADICIONAL'
    )),
  modo_calculo text not null default 'VALOR_FIXO'
    check (modo_calculo in (
      'VALOR_FIXO',
      'VALOR_TOTAL_FAIXA',
      'VALOR_POR_PARTICIPANTE',
      'VALOR_INCREMENTAL'
    )),
  descricao_regra text null,
  formacao_coreografia text null
    check (formacao_coreografia in ('SOLO', 'DUO', 'TRIO', 'GRUPO', 'TURMA', 'LIVRE')),
  estilo_id uuid null references public.coreografia_estilos(id) on delete set null,
  modalidade_nome text null,
  ordem_progressao integer null
    check (ordem_progressao is null or ordem_progressao >= 1),
  quantidade_minima integer null
    check (quantidade_minima is null or quantidade_minima >= 1),
  quantidade_maxima integer null
    check (quantidade_maxima is null or quantidade_maxima >= 1),
  valor_centavos integer not null default 0
    check (valor_centavos >= 0),
  valor_por_participante_centavos integer null
    check (
      valor_por_participante_centavos is null
      or valor_por_participante_centavos >= 0
    ),
  ativa boolean not null default true,
  ordem_aplicacao integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eventos_escola_edicao_regras_financeiras_edicao
  on public.eventos_escola_edicao_regras_financeiras(edicao_id);

create index if not exists idx_eventos_escola_edicao_regras_financeiras_tipo
  on public.eventos_escola_edicao_regras_financeiras(edicao_id, tipo_regra, ativa, ordem_aplicacao);

create index if not exists idx_eventos_escola_edicao_regras_financeiras_estilo
  on public.eventos_escola_edicao_regras_financeiras(estilo_id)
  where estilo_id is not null;

comment on table public.eventos_escola_edicao_regras_financeiras is
  'Regras financeiras configuraveis por edicao do evento. A inscricao aplica estas regras sobre taxa geral, formacao, modalidade, progressao e quantidade, sem depender do valor da coreografia como fonte principal.';

comment on column public.eventos_escola_edicao_regras_financeiras.modalidade_nome is
  'Referencia textual de modalidade quando a cobranca nao for controlada apenas por estilo estruturado.';

comment on column public.eventos_escola_edicao_regras_financeiras.valor_por_participante_centavos is
  'Campo opcional para regras que precisem explicitar valor individual por participante, mesmo quando o tipo da regra represente uma faixa ou combinacao maior.';

comment on column public.eventos_escola_edicao_regras_financeiras.ordem_aplicacao is
  'Ordem de prioridade dentro do mesmo tipo de regra, usada pela inscricao para escolher e compor os calculos.';

comment on column public.eventos_escola_edicao_coreografias.valor_participacao_coreografia_centavos is
  'Campo legado/excepcional. O valor padrao da inscricao deve ser calculado pelas regras financeiras da edicao.';

commit;
