begin;

-- 2.1) Beneficiarios do Projeto Social (canonico)
create table if not exists public.projetos_sociais_beneficiarios (
  id bigserial primary key,
  projeto_social_id bigint not null references public.projetos_sociais(id) on delete cascade,
  pessoa_id bigint not null references public.pessoas(id) on delete restrict,

  status text not null default 'ATIVO' check (status in ('ATIVO','INATIVO','SUSPENSO')),
  data_inicio date not null default current_date,
  data_fim date null,

  -- campos uteis para futuro (nao obrigatorios):
  origem_legado text null,              -- ex.: "MOVIMENTO_CONEXAO_DANCA"
  legado_payload jsonb null,            -- snapshot bruto do registro legado (se existir)
  observacoes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_psb_datas check (data_fim is null or data_fim >= data_inicio)
);

create index if not exists idx_psb_projeto on public.projetos_sociais_beneficiarios (projeto_social_id);
create index if not exists idx_psb_pessoa on public.projetos_sociais_beneficiarios (pessoa_id);
create index if not exists idx_psb_status on public.projetos_sociais_beneficiarios (status);

-- regra base: uma pessoa nao deve ter duplicidade no mesmo projeto (status pode mudar)
create unique index if not exists ux_psb_projeto_pessoa
  on public.projetos_sociais_beneficiarios (projeto_social_id, pessoa_id);

-- 2.2) (Opcional) vincular concessao de bolsa a um beneficiario do projeto
-- Isso reforca o conceito: bolsa so faz sentido "dentro do projeto".
alter table public.bolsa_concessoes
  add column if not exists projeto_social_beneficiario_id bigint null;

-- Vamos criar FK somente se a coluna existir (ela existe apos o alter acima)
do $$
begin
  if to_regclass('public.projetos_sociais_beneficiarios') is not null then
    begin
      alter table public.bolsa_concessoes
        add constraint fk_bolsa_concessoes_psb
        foreign key (projeto_social_beneficiario_id)
        references public.projetos_sociais_beneficiarios(id)
        on delete set null;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

commit;
