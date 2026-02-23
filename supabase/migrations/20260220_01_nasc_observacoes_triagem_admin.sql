-- Triagem admin para NASC (reaproveita tabela existente de observacoes)

begin;

alter table if exists public.nasc_observacoes
  add column if not exists status text not null default 'ABERTO',
  add column if not exists triagem_notas text null,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.nasc_observacoes
  drop constraint if exists nasc_observacoes_status_chk;

alter table if exists public.nasc_observacoes
  add constraint nasc_observacoes_status_chk
    check (status in ('ABERTO','EM_ANALISE','EM_ANDAMENTO','RESOLVIDO','FECHADO'));

create index if not exists idx_nasc_observacoes_status
  on public.nasc_observacoes (status);

create index if not exists idx_nasc_observacoes_updated_at
  on public.nasc_observacoes (updated_at desc);

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create or replace function public.set_updated_at()
    returns trigger as $f$
    begin
      new.updated_at = now();
      return new;
    end;
    $f$ language plpgsql;
  end if;
end $$;

drop trigger if exists trg_nasc_observacoes_updated_at on public.nasc_observacoes;

create trigger trg_nasc_observacoes_updated_at
before update on public.nasc_observacoes
for each row execute function public.set_updated_at();

commit;
