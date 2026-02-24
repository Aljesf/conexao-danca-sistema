create table if not exists public.turma_professores (
  id bigserial primary key,
  turma_id bigint not null references public.turmas(id) on delete cascade,
  colaborador_id bigint not null references public.colaboradores(id),
  funcao_id bigint not null references public.funcoes_colaborador(id),
  principal boolean not null default false,
  data_inicio date not null default current_date,
  data_fim date,
  ativo boolean not null default true,
  observacoes text,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_turma_professores_principal
on public.turma_professores (turma_id)
where principal = true and data_fim is null;
create or replace function public.set_updated_at_turma_professores()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
create trigger trg_updated_at_turma_professores
before update on public.turma_professores
for each row
execute procedure public.set_updated_at_turma_professores();
