begin;

-- 1) Garantir Projeto Social (com e sem acento)
insert into public.projetos_sociais (escola_id, nome, descricao, ativo)
select
  null,
  U&'Movimento Conex\00E3o Dan\00E7a',
  'Projeto social institucional (migrado do legado Movimento).',
  true
where not exists (
  select 1
  from public.projetos_sociais
  where nome = U&'Movimento Conex\00E3o Dan\00E7a'
);

insert into public.projetos_sociais (escola_id, nome, descricao, ativo)
select
  null,
  'Movimento Conexao Danca',
  'Projeto social institucional (fallback sem acento).',
  true
where not exists (
  select 1
  from public.projetos_sociais
  where nome = 'Movimento Conexao Danca'
)
and not exists (
  select 1
  from public.projetos_sociais
  where nome = U&'Movimento Conex\00E3o Dan\00E7a'
);

-- 2) Resolver projeto e migrar beneficiarios no modelo canonico
do $$
declare
  v_projeto_id bigint;
  v_nome_canonico text := U&'Movimento Conex\00E3o Dan\00E7a';
  v_nome_fallback text := 'Movimento Conexao Danca';
begin
  if to_regclass('public.movimento_beneficiarios') is null then
    raise exception 'Tabela public.movimento_beneficiarios nao encontrada.';
  end if;

  if to_regclass('public.projetos_sociais_beneficiarios') is null then
    raise exception 'Tabela public.projetos_sociais_beneficiarios nao encontrada.';
  end if;

  select id into v_projeto_id
  from public.projetos_sociais
  where nome in (v_nome_canonico, v_nome_fallback)
  order by case when nome = v_nome_canonico then 1 else 2 end
  limit 1;

  if v_projeto_id is null then
    raise exception 'Projeto Social Movimento Conexao Danca nao encontrado.';
  end if;

  insert into public.projetos_sociais_beneficiarios (
    projeto_social_id,
    pessoa_id,
    status,
    data_inicio,
    data_fim,
    origem_legado,
    legado_payload,
    observacoes
  )
  select
    v_projeto_id as projeto_social_id,
    mb.pessoa_id,
    'ATIVO' as status,
    coalesce((mb.criado_em)::date, current_date) as data_inicio,
    mb.valido_ate as data_fim,
    'MOVIMENTO_CONEXAO_DANCA' as origem_legado,
    to_jsonb(mb) as legado_payload,
    mb.observacoes as observacoes
  from public.movimento_beneficiarios mb
  where mb.pessoa_id is not null
  on conflict (projeto_social_id, pessoa_id) do update
  set
    status = excluded.status,
    data_inicio = least(projetos_sociais_beneficiarios.data_inicio, excluded.data_inicio),
    data_fim = excluded.data_fim,
    origem_legado = excluded.origem_legado,
    legado_payload = excluded.legado_payload,
    observacoes = coalesce(excluded.observacoes, projetos_sociais_beneficiarios.observacoes),
    updated_at = now();
end $$;

commit;

-- Validacao (rodar manualmente apos aplicar):
-- select
--   ps.id,
--   ps.nome,
--   count(psb.id) as total_beneficiarios
-- from public.projetos_sociais ps
-- left join public.projetos_sociais_beneficiarios psb
--   on psb.projeto_social_id = ps.id
-- where ps.nome in (U&'Movimento Conex\00E3o Dan\00E7a', 'Movimento Conexao Danca')
-- group by ps.id, ps.nome
-- order by ps.nome;
--
-- select
--   psb.id,
--   psb.pessoa_id,
--   psb.status,
--   psb.data_inicio,
--   psb.data_fim,
--   psb.origem_legado
-- from public.projetos_sociais_beneficiarios psb
-- join public.projetos_sociais ps on ps.id = psb.projeto_social_id
-- where ps.nome in (U&'Movimento Conex\00E3o Dan\00E7a', 'Movimento Conexao Danca')
-- order by psb.id desc
-- limit 10;
