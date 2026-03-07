begin;

-- =========================================================
-- 1. TABELA CANONICA DE OPERACOES DOCUMENTAIS
-- =========================================================
create table if not exists public.documentos_operacoes (
  id bigserial primary key,
  codigo text not null,
  nome text not null,
  descricao text null,
  tipo_documento_id bigint null references public.documentos_tipos(tipo_documento_id) on delete set null,
  ativo boolean not null default true,
  exige_origem boolean not null default true,
  permite_reemissao boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_operacoes_codigo_key unique (codigo)
);

create index if not exists idx_documentos_operacoes_tipo_documento_id
  on public.documentos_operacoes (tipo_documento_id);

create index if not exists idx_documentos_operacoes_ativo
  on public.documentos_operacoes (ativo);

comment on table public.documentos_operacoes is
'Catalogo canonico das operacoes documentais do sistema.';

comment on column public.documentos_operacoes.codigo is
'Codigo estavel da operacao documental. Ex.: RECIBO_PAGAMENTO_CONFIRMADO.';

comment on column public.documentos_operacoes.exige_origem is
'Indica se a emissao exige vinculo formal com origem de negocio.';

comment on column public.documentos_operacoes.permite_reemissao is
'Indica se a operacao admite reemissao historica.';

-- =========================================================
-- 2. PIVOT OPERACAO X CONJUNTOS
-- =========================================================
create table if not exists public.documentos_operacoes_conjuntos (
  id bigserial primary key,
  operacao_id bigint not null references public.documentos_operacoes(id) on delete cascade,
  conjunto_id bigint not null references public.documentos_conjuntos(id) on delete cascade,
  ordem integer not null default 1,
  obrigatorio boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_operacoes_conjuntos_operacao_conjunto_key unique (operacao_id, conjunto_id)
);

create index if not exists idx_documentos_operacoes_conjuntos_operacao_id
  on public.documentos_operacoes_conjuntos (operacao_id);

create index if not exists idx_documentos_operacoes_conjuntos_conjunto_id
  on public.documentos_operacoes_conjuntos (conjunto_id);

comment on table public.documentos_operacoes_conjuntos is
'Relaciona operacoes documentais aos conjuntos documentais reutilizaveis.';

comment on column public.documentos_operacoes_conjuntos.ordem is
'Ordem logica do conjunto dentro da operacao.';

comment on column public.documentos_operacoes_conjuntos.obrigatorio is
'Indica se o conjunto e obrigatorio para a operacao.';

-- =========================================================
-- 3. COMPONENTES SEMANTICOS DE CABECALHO E RODAPE
-- DECISAO: TABELAS NOVAS, SEM MEXER NO PAPEL GENERICO
-- DE public.documentos_layout_templates
-- =========================================================
create table if not exists public.documentos_cabecalhos (
  id bigserial primary key,
  codigo text not null,
  nome text not null,
  descricao text null,
  html_template text not null,
  css_template text null,
  config_json jsonb not null default '{}'::jsonb,
  layout_template_id bigint null references public.documentos_layout_templates(layout_template_id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_cabecalhos_codigo_key unique (codigo)
);

create index if not exists idx_documentos_cabecalhos_layout_template_id
  on public.documentos_cabecalhos (layout_template_id);

create index if not exists idx_documentos_cabecalhos_ativo
  on public.documentos_cabecalhos (ativo);

comment on table public.documentos_cabecalhos is
'Componentes institucionais reutilizaveis de cabecalho para documentos.';

comment on column public.documentos_cabecalhos.layout_template_id is
'Referencia opcional para template generico ja existente.';

comment on column public.documentos_cabecalhos.config_json is
'Configuracoes visuais e institucionais do cabecalho.';

create table if not exists public.documentos_rodapes (
  id bigserial primary key,
  codigo text not null,
  nome text not null,
  descricao text null,
  html_template text not null,
  css_template text null,
  config_json jsonb not null default '{}'::jsonb,
  layout_template_id bigint null references public.documentos_layout_templates(layout_template_id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_rodapes_codigo_key unique (codigo)
);

create index if not exists idx_documentos_rodapes_layout_template_id
  on public.documentos_rodapes (layout_template_id);

create index if not exists idx_documentos_rodapes_ativo
  on public.documentos_rodapes (ativo);

comment on table public.documentos_rodapes is
'Componentes institucionais reutilizaveis de rodape para documentos.';

comment on column public.documentos_rodapes.layout_template_id is
'Referencia opcional para template generico ja existente.';

comment on column public.documentos_rodapes.config_json is
'Configuracoes de assinatura, validacao, hash, QR code e dados institucionais.';

-- =========================================================
-- 4. VINCULO DE MODELO COM CABECALHO E RODAPE
-- =========================================================
alter table public.documentos_modelo
  add column if not exists operacao_id bigint null,
  add column if not exists cabecalho_id bigint null,
  add column if not exists rodape_id bigint null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documentos_modelo_operacao_fk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_operacao_fk
      foreign key (operacao_id)
      references public.documentos_operacoes(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'documentos_modelo_cabecalho_fk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_cabecalho_fk
      foreign key (cabecalho_id)
      references public.documentos_cabecalhos(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'documentos_modelo_rodape_fk'
  ) then
    alter table public.documentos_modelo
      add constraint documentos_modelo_rodape_fk
      foreign key (rodape_id)
      references public.documentos_rodapes(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_documentos_modelo_operacao_id
  on public.documentos_modelo (operacao_id);

create index if not exists idx_documentos_modelo_cabecalho_id
  on public.documentos_modelo (cabecalho_id);

create index if not exists idx_documentos_modelo_rodape_id
  on public.documentos_modelo (rodape_id);

comment on column public.documentos_modelo.operacao_id is
'Operacao documental canonica vinculada ao modelo.';

comment on column public.documentos_modelo.cabecalho_id is
'Cabecalho institucional reutilizavel vinculado ao modelo.';

comment on column public.documentos_modelo.rodape_id is
'Rodape institucional reutilizavel vinculado ao modelo.';

-- =========================================================
-- 5. CAMPOS CANONICOS EM DOCUMENTOS EMITIDOS
-- =========================================================
alter table public.documentos_emitidos
  add column if not exists operacao_id bigint null,
  add column if not exists origem_tipo text null,
  add column if not exists origem_id text null,
  add column if not exists documento_origem_id bigint null,
  add column if not exists motivo_reemissao text null,
  add column if not exists tipo_relacao_documental text not null default 'ORIGINAL';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documentos_emitidos_operacao_fk'
  ) then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_operacao_fk
      foreign key (operacao_id)
      references public.documentos_operacoes(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'documentos_emitidos_documento_origem_fk'
  ) then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_documento_origem_fk
      foreign key (documento_origem_id)
      references public.documentos_emitidos(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'documentos_emitidos_tipo_relacao_documental_check'
  ) then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_tipo_relacao_documental_check
      check (
        tipo_relacao_documental in (
          'ORIGINAL',
          'REEMISSAO',
          'SUBSTITUICAO',
          'DERIVADO'
        )
      );
  end if;
end $$;

create index if not exists idx_documentos_emitidos_operacao_id
  on public.documentos_emitidos (operacao_id);

create index if not exists idx_documentos_emitidos_origem_tipo_origem_id
  on public.documentos_emitidos (origem_tipo, origem_id);

create index if not exists idx_documentos_emitidos_documento_origem_id
  on public.documentos_emitidos (documento_origem_id);

create index if not exists idx_documentos_emitidos_tipo_relacao_documental
  on public.documentos_emitidos (tipo_relacao_documental);

comment on column public.documentos_emitidos.operacao_id is
'Operacao documental canonica da emissao.';

comment on column public.documentos_emitidos.origem_tipo is
'Tipo semantico da origem de negocio. Ex.: RECEBIMENTO.';

comment on column public.documentos_emitidos.origem_id is
'Identificador textual da origem para suportar bigint, uuid ou chaves compostas futuras.';

comment on column public.documentos_emitidos.documento_origem_id is
'Documento anterior relacionado em casos de reemissao, substituicao ou derivacao.';

comment on column public.documentos_emitidos.motivo_reemissao is
'Justificativa formal para reemissao ou substituicao.';

comment on column public.documentos_emitidos.tipo_relacao_documental is
'Relacao historica do documento emitido dentro da cadeia documental.';

-- =========================================================
-- 6. SEED MINIMO DAS OPERACOES INICIAIS
-- =========================================================
insert into public.documentos_operacoes (
  codigo,
  nome,
  descricao,
  ativo,
  exige_origem,
  permite_reemissao
)
select
  'RECIBO_PAGAMENTO_CONFIRMADO',
  'Recibo por pagamento confirmado',
  'Operacao documental para emissao de recibo a partir de recebimento confirmado.',
  true,
  true,
  true
where not exists (
  select 1
  from public.documentos_operacoes
  where codigo = 'RECIBO_PAGAMENTO_CONFIRMADO'
);

insert into public.documentos_operacoes (
  codigo,
  nome,
  descricao,
  ativo,
  exige_origem,
  permite_reemissao
)
select
  'RECIBO_CONTA_INTERNA_MENSAL',
  'Recibo consolidado mensal da conta interna',
  'Operacao documental futura para emissao consolidada mensal por pessoa e competencia.',
  true,
  true,
  true
where not exists (
  select 1
  from public.documentos_operacoes
  where codigo = 'RECIBO_CONTA_INTERNA_MENSAL'
);

commit;

select pg_notify('pgrst', 'reload schema');
