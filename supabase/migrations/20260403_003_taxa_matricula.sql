-- A3: Suporte a taxa de matrícula

-- 1. Adicionar tipo_item na tabela de itens de preços
alter table public.matricula_tabela_itens
  add column if not exists tipo_item_classe text;

comment on column public.matricula_tabela_itens.tipo_item_classe is
  'Classificação do item: RECORRENTE (mensalidade), UNICO (taxa matrícula), EVENTUAL.';

-- 2. Criar categoria financeira TAXA_MATRICULA
insert into public.categorias_financeiras (nome, tipo, plano_conta_id, ativo, created_at, updated_at)
select 'TAXA_MATRICULA', 'RECEITA', pc.id, true, now(), now()
from public.plano_contas pc
where upper(trim(coalesce(pc.codigo, ''))) = 'RECEITA'
   or upper(trim(coalesce(pc.nome, ''))) like '%RECEITA%'
order by pc.id
limit 1
on conflict do nothing;

-- 3. Adicionar campos em matriculas para rastreabilidade
alter table public.matriculas
  add column if not exists tem_taxa_matricula boolean not null default false;

alter table public.matriculas
  add column if not exists valor_taxa_matricula_centavos integer;

comment on column public.matriculas.tem_taxa_matricula is
  'Indica se esta matrícula cobrou taxa de matrícula no ato.';

comment on column public.matriculas.valor_taxa_matricula_centavos is
  'Valor da taxa de matrícula cobrada, em centavos.';

-- 4. Configuração global
alter table public.escola_config_financeira
  add column if not exists taxa_matricula_ativa boolean not null default false;

comment on column public.escola_config_financeira.taxa_matricula_ativa is
  'Quando true, o fluxo de matrícula verifica e cobra taxa de matrícula se existir na tabela de preços.';
