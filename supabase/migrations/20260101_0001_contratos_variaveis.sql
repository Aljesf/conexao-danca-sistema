begin;

create table if not exists public.contratos_variaveis (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  descricao text not null,
  origem text not null check (origem in (
    'PESSOA',
    'RESPONSAVEL',
    'MATRICULA',
    'FINANCEIRO',
    'MANUAL'
  )),
  tipo text not null check (tipo in (
    'TEXTO',
    'MONETARIO',
    'DATA'
  )),
  path_origem text,
  formato text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

commit;

select pg_notify('pgrst', 'reload schema');
