begin;

-- ============================================================
-- Matrículas: camada granular por item e desacoplamento de turma
-- ============================================================
-- Objetivos desta migration:
-- 1) introduzir public.matricula_itens como unidade granular da matrícula
-- 2) permitir rastreabilidade operacional entre turma_aluno e o item da matrícula
-- 3) reforçar idempotência do novo padrão de lançamento elegível no Cartão Conexão
-- 4) não alterar a origem canônica da cobrança mensal do Cartão Conexão

create table if not exists public.matricula_itens (
  id bigserial primary key,
  matricula_id bigint not null references public.matriculas(id) on delete cascade,
  curso_id bigint null,
  modulo_id bigint null,
  turma_id_inicial bigint null references public.turmas(turma_id),
  descricao text not null,
  origem_tipo text not null default 'CURSO',
  valor_base_centavos integer not null default 0,
  valor_liquido_centavos integer not null default 0,
  status text not null default 'ATIVO',
  data_inicio date not null default current_date,
  data_fim date null,
  cancelamento_tipo text null,
  observacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matricula_itens_status_chk
    check (status in ('ATIVO', 'CANCELADO', 'ENCERRADO'))
);

comment on table public.matricula_itens is
  'Camada granular da matrícula. Cada item representa um módulo/produto operacional dentro da matrícula principal.';
comment on column public.matricula_itens.turma_id_inicial is
  'Turma operacional inicial do item. Trocas posteriores ocorrem em turma_aluno sem alterar o item financeiro.';
comment on column public.matricula_itens.modulo_id is
  'Identificador do módulo/produto associado ao item quando houver mapeamento explícito no domínio.';
comment on column public.matricula_itens.origem_tipo is
  'Origem declarativa do item. Ex.: CURSO, MODULO, PRODUTO.';

create index if not exists idx_matricula_itens_matricula_id
  on public.matricula_itens (matricula_id);

create index if not exists idx_matricula_itens_status
  on public.matricula_itens (status);

create index if not exists idx_matricula_itens_modulo_id
  on public.matricula_itens (modulo_id);

create index if not exists idx_matricula_itens_turma_inicial
  on public.matricula_itens (turma_id_inicial);

-- turma_aluno: vinculo operacional passa a poder apontar para o item granular
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'turma_aluno'
      and column_name = 'matricula_item_id'
  ) then
    alter table public.turma_aluno
      add column matricula_item_id bigint null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'turma_aluno_matricula_item_id_fkey'
  ) then
    alter table public.turma_aluno
      add constraint turma_aluno_matricula_item_id_fkey
      foreign key (matricula_item_id) references public.matricula_itens(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists idx_turma_aluno_matricula_item_id
  on public.turma_aluno (matricula_item_id);

-- Reforço defensivo: alguns bancos antigos podem não ter a FK explícita para pessoas.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'turma_aluno'
      and column_name = 'aluno_pessoa_id'
  )
  and not exists (
    select 1 from pg_constraint where conname = 'turma_aluno_aluno_pessoa_id_fkey'
  ) then
    alter table public.turma_aluno
      add constraint turma_aluno_aluno_pessoa_id_fkey
      foreign key (aluno_pessoa_id) references public.pessoas(id)
      on update cascade
      on delete restrict;
  end if;
end $$;

-- credito_conexao_lancamentos: referencia determinística por item para idempotência segura
alter table public.credito_conexao_lancamentos
  add column if not exists referencia_item text null;

create index if not exists idx_credito_conexao_lancamentos_referencia_item
  on public.credito_conexao_lancamentos (referencia_item);

create unique index if not exists uq_credito_conexao_lancamentos_matricula_item_ref
  on public.credito_conexao_lancamentos (referencia_item)
  where referencia_item is not null
    and referencia_item like 'matricula-item:%';

-- ============================================================
-- Comentários operacionais
-- ============================================================
-- 1) Matrícula não gera mais cobrança mensal paralela de Cartão Conexão.
--    A origem canônica da cobrança mensal continua sendo a fatura do Cartão Conexão.
-- 2) O item de matrícula passa a ser a unidade granular para módulo/produto.
-- 3) Troca de turma passa a ser tratada como movimento operacional, não financeiro.

commit;
