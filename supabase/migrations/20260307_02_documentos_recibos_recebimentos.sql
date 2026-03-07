begin;

-- Vinculo rastreavel entre recibo emitido e recebimento confirmado.
alter table public.documentos_emitidos
  add column if not exists recebimento_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documentos_emitidos_recebimento_fk'
  ) then
    alter table public.documentos_emitidos
      add constraint documentos_emitidos_recebimento_fk
      foreign key (recebimento_id)
      references public.recebimentos(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_documentos_emitidos_recebimento_id
  on public.documentos_emitidos (recebimento_id)
  where recebimento_id is not null;

comment on column public.documentos_emitidos.recebimento_id is
'Recebimento confirmado que originou a emissao do recibo financeiro.';

commit;

select pg_notify('pgrst', 'reload schema');
