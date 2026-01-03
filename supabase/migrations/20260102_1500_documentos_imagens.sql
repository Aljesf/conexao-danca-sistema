begin;

create table if not exists public.documentos_imagens (
  imagem_id bigserial primary key,
  nome text not null,
  tags text[] not null default '{}',
  bucket text not null default 'documentos-imagens',
  path text not null,
  public_url text not null,
  largura int,
  altura int,
  mime_type text,
  tamanho_bytes bigint,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists documentos_imagens_ativo_idx on public.documentos_imagens(ativo);
create index if not exists documentos_imagens_tags_gin on public.documentos_imagens using gin(tags);

commit;
select pg_notify('pgrst', 'reload schema');
