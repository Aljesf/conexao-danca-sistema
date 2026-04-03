create table if not exists public.coreografia_formacoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  quantidade_minima_padrao integer not null check (quantidade_minima_padrao >= 1),
  quantidade_maxima_padrao integer not null check (quantidade_maxima_padrao >= quantidade_minima_padrao),
  quantidade_fixa boolean not null default false,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_coreografia_formacoes_codigo
  on public.coreografia_formacoes(codigo);

create unique index if not exists idx_coreografia_formacoes_nome_unico
  on public.coreografia_formacoes(lower(nome));

insert into public.coreografia_formacoes (
  codigo,
  nome,
  quantidade_minima_padrao,
  quantidade_maxima_padrao,
  quantidade_fixa,
  ativa
)
values
  ('SOLO', 'Solo', 1, 1, true, true),
  ('DUO', 'Dupla', 2, 2, true, true),
  ('TRIO', 'Trio', 3, 3, true, true),
  ('GRUPO', 'Grupo', 1, 20, false, true),
  ('TURMA', 'Turma', 1, 40, false, true),
  ('LIVRE', 'Livre', 1, 20, false, true)
on conflict (codigo) do update
set
  nome = excluded.nome,
  quantidade_minima_padrao = excluded.quantidade_minima_padrao,
  quantidade_maxima_padrao = excluded.quantidade_maxima_padrao,
  quantidade_fixa = excluded.quantidade_fixa,
  ativa = excluded.ativa,
  updated_at = now();

alter table public.coreografias
  add column if not exists formacao_id uuid;

update public.coreografias coreografia
set formacao_id = formacao.id
from public.coreografia_formacoes formacao
where coreografia.formacao_id is null
  and formacao.codigo = coalesce(coreografia.tipo_formacao::text, 'LIVRE');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_coreografias_formacao'
  ) then
    alter table public.coreografias
      add constraint fk_coreografias_formacao
      foreign key (formacao_id)
      references public.coreografia_formacoes(id);
  end if;
end $$;

alter table public.coreografias
  alter column formacao_id set not null;

create index if not exists idx_coreografias_formacao_id
  on public.coreografias(formacao_id);

comment on table public.coreografia_formacoes is
'Cadastro estruturado das formacoes artisticas reutilizadas nas coreografias, com regras padrao de capacidade e formacao fixa/aberta.';

comment on column public.coreografias.formacao_id is
'Referencia estruturada da formacao artistica. Mantem compatibilidade com tipo_formacao durante a transicao do dominio.';
