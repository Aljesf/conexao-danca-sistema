begin;

-- 0) Protecao: confirmar que nao ha dados (falhar se tiver, para evitar perda acidental)
do $$
declare
  v_count bigint;
begin
  select count(*) into v_count from public.movimento_beneficiarios;
  if v_count > 0 then
    raise exception 'movimento_beneficiarios possui % registros; esta migration assume tabela vazia.', v_count;
  end if;
end $$;

-- 1) Remover FK antiga (caso exista)
alter table public.movimento_beneficiarios
  drop constraint if exists movimento_beneficiarios_pessoa_id_fkey;

-- 2) Dropar coluna pessoa_id antiga (uuid), se existir
alter table public.movimento_beneficiarios
  drop column if exists pessoa_id;

-- 3) Recriar pessoa_id como BIGINT
alter table public.movimento_beneficiarios
  add column pessoa_id bigint not null;

-- 4) Criar FK correta para pessoas(id)
alter table public.movimento_beneficiarios
  add constraint movimento_beneficiarios_pessoa_id_fkey
  foreign key (pessoa_id)
  references public.pessoas(id)
  on delete restrict;

-- 5) Indice para performance (listas/filtros)
create index if not exists ix_movimento_beneficiarios_pessoa_id
  on public.movimento_beneficiarios (pessoa_id);

commit;
