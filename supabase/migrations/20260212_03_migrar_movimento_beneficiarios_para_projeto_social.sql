begin;

do $$
declare
  v_projeto_id bigint;
  v_col_pessoa text;
  v_col_data text;
  v_sql text;
  v_nome_canonico text := U&'Movimento Conex\00E3o Dan\00E7a';
  v_nome_fallback text := 'Movimento Conexao Danca';
begin
  if to_regclass('public.movimento_beneficiarios') is null then
    raise exception 'Tabela public.movimento_beneficiarios nao encontrada.';
  end if;

  -- 1) Garantir o projeto social canonico
  insert into public.projetos_sociais (escola_id, nome, descricao, ativo)
  select null, v_nome_canonico, 'Projeto social institucional (migrado do legado Movimento).', true
  where not exists (
    select 1
    from public.projetos_sociais
    where nome in (v_nome_canonico, v_nome_fallback)
  );

  select id into v_projeto_id
  from public.projetos_sociais
  where nome in (v_nome_canonico, v_nome_fallback)
  order by case when nome = v_nome_canonico then 1 else 2 end
  limit 1;

  if v_projeto_id is null then
    raise exception 'Projeto Social "Movimento Conexao Danca" nao encontrado (falha ao criar/selecionar).';
  end if;

  -- 2) Descobrir coluna de pessoa no legado
  select c.column_name into v_col_pessoa
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'movimento_beneficiarios'
    and c.column_name in ('pessoa_id', 'beneficiario_pessoa_id', 'aluno_pessoa_id', 'pessoa_beneficiario_id')
  order by case c.column_name
    when 'pessoa_id' then 1
    when 'beneficiario_pessoa_id' then 2
    when 'aluno_pessoa_id' then 3
    when 'pessoa_beneficiario_id' then 4
    else 99
  end
  limit 1;

  if v_col_pessoa is null then
    raise exception 'Nao encontrei coluna de pessoa em movimento_beneficiarios.';
  end if;

  -- 3) Descobrir coluna de data para data_inicio (fallback em current_date)
  select c.column_name into v_col_data
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'movimento_beneficiarios'
    and c.column_name in ('created_at', 'criado_em', 'updated_at', 'atualizado_em', 'data_inicio')
  order by case c.column_name
    when 'created_at' then 1
    when 'criado_em' then 2
    when 'updated_at' then 3
    when 'atualizado_em' then 4
    when 'data_inicio' then 5
    else 99
  end
  limit 1;

  -- 4) Migrar beneficiarios (idempotente no unique projeto_social_id+pessoa_id)
  if v_col_data is null then
    v_sql := format($fmt$
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
        %s as projeto_social_id,
        (mb.%I)::bigint as pessoa_id,
        'ATIVO' as status,
        current_date as data_inicio,
        null as data_fim,
        'MOVIMENTO_CONEXAO_DANCA' as origem_legado,
        to_jsonb(mb) as legado_payload,
        null as observacoes
      from public.movimento_beneficiarios mb
      where mb.%I is not null
      on conflict (projeto_social_id, pessoa_id) do nothing;
    $fmt$, v_projeto_id, v_col_pessoa, v_col_pessoa);
  else
    v_sql := format($fmt$
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
        %s as projeto_social_id,
        (mb.%I)::bigint as pessoa_id,
        'ATIVO' as status,
        coalesce((mb.%I)::date, current_date) as data_inicio,
        null as data_fim,
        'MOVIMENTO_CONEXAO_DANCA' as origem_legado,
        to_jsonb(mb) as legado_payload,
        null as observacoes
      from public.movimento_beneficiarios mb
      where mb.%I is not null
      on conflict (projeto_social_id, pessoa_id) do nothing;
    $fmt$, v_projeto_id, v_col_pessoa, v_col_data, v_col_pessoa);
  end if;

  execute v_sql;
end $$;

commit;

