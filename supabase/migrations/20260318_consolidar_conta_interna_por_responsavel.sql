begin;

-- O projeto usa public.credito_conexao_contas como tabela canônica de conta interna.
-- Esta migration consolida o vínculo da conta no responsável financeiro sem remover
-- nenhuma estrutura legada.

alter table public.credito_conexao_contas
add column if not exists responsavel_financeiro_pessoa_id bigint;

do $$
begin
  begin
    alter table public.credito_conexao_contas
      add constraint credito_conexao_contas_responsavel_financeiro_pessoa_id_fkey
      foreign key (responsavel_financeiro_pessoa_id)
      references public.pessoas(id)
      on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

alter table public.credito_conexao_lancamentos
add column if not exists aluno_id bigint,
add column if not exists matricula_id bigint;

do $$
begin
  begin
    alter table public.credito_conexao_lancamentos
      add constraint credito_conexao_lancamentos_aluno_id_fkey
      foreign key (aluno_id)
      references public.pessoas(id)
      on delete set null;
  exception when duplicate_object then
    null;
  end;

  begin
    alter table public.credito_conexao_lancamentos
      add constraint credito_conexao_lancamentos_matricula_id_fkey
      foreign key (matricula_id)
      references public.matriculas(id)
      on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

create index if not exists idx_credito_conexao_contas_responsavel_financeiro_pessoa_id
  on public.credito_conexao_contas (responsavel_financeiro_pessoa_id);

create index if not exists idx_credito_conexao_lancamentos_aluno_id
  on public.credito_conexao_lancamentos (aluno_id);

create index if not exists idx_credito_conexao_lancamentos_matricula_id
  on public.credito_conexao_lancamentos (matricula_id);

comment on column public.credito_conexao_contas.responsavel_financeiro_pessoa_id is
'Responsável financeiro consolidado da conta interna do aluno. A aplicação deve reutilizar uma única conta por responsável.';

comment on column public.credito_conexao_lancamentos.aluno_id is
'Aluno relacionado ao lançamento da conta interna quando o débito vier do fluxo escolar.';

comment on column public.credito_conexao_lancamentos.matricula_id is
'Matrícula relacionada ao lançamento da conta interna quando existir vínculo escolar.';

commit;
