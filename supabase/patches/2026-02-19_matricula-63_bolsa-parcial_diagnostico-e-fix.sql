-- Patch controlado: Diagnóstico + correção de liquidação híbrida (bolsa parcial)
-- Matrícula alvo: 63
-- Versão: tolerante a tabelas inexistentes (não aborta o script)

begin;

do $$
begin
  raise notice 'Iniciando diagnóstico/patch: matricula_id=63';
end $$;

-- =========================
-- B) SCANNER (descobrir tabelas/colunas relacionadas)
-- =========================
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'matricula_id'
order by table_name, column_name;

select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    column_name ilike '%bolsa%' or
    column_name ilike '%movimento%' or
    column_name ilike '%projeto%' or
    column_name ilike '%benef%' or
    column_name ilike '%concess%' or
    column_name ilike '%percent%'
  )
order by table_name, column_name;

select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='cobrancas'
order by ordinal_position;

select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name = 'credito_conexao_lancamentos'
order by ordinal_position;

-- =========================
-- C) DIAGNÓSTICO DIRETO DA MATRÍCULA 63
-- =========================

select *
from public.matriculas
where id = 63;

-- turma_aluno (se existir coluna matricula_id)
do $$
begin
  if to_regclass('public.turma_aluno') is not null then
    execute $q$
      select *
      from public.turma_aluno
      where matricula_id = 63
      order by turma_aluno_id desc
      limit 50
    $q$;
  else
    raise notice 'Tabela public.turma_aluno não existe. Pulando.';
  end if;
end $$;

-- matricula_execucao_valores (se existir)
do $$
begin
  if to_regclass('public.matricula_execucao_valores') is not null then
    execute $q$
      select *
      from public.matricula_execucao_valores
      where matricula_id = 63
      order by id desc
      limit 200
    $q$;
  else
    raise notice 'Tabela public.matricula_execucao_valores não existe. Pulando.';
  end if;
end $$;

-- matricula_execucoes (NÃO existe no seu banco; agora está protegido)
do $$
begin
  if to_regclass('public.matricula_execucoes') is not null then
    execute $q$
      select *
      from public.matricula_execucoes
      where matricula_id = 63
      order by id desc
      limit 200
    $q$;
  else
    raise notice 'Tabela public.matricula_execucoes não existe. Pulando.';
  end if;
end $$;

-- Cobranças por matrícula (se a coluna existir)
do $$
begin
  if to_regclass('public.cobrancas') is null then
    raise notice 'Tabela public.cobrancas não existe. Abortando (não há como corrigir sem cobrancas).';
    raise exception 'cobrancas_inexistente';
  end if;

  -- tenta com matricula_id
  begin
    execute $q$
      select *
      from public.cobrancas
      where matricula_id = 63
      order by id desc
      limit 200
    $q$;
  exception when undefined_column then
    raise notice 'Coluna cobrancas.matricula_id não existe. Pulando este diagnóstico.';
  end;

  -- busca por descricao/origem_id/origem_tipo (com tolerância)
  begin
    execute $q$
      select *
      from public.cobrancas
      where (descricao ilike '%matr%' and descricao ilike '%63%')
         or (origem_tipo ilike '%MATRIC%' or origem_tipo ilike '%MATRICULA%')
         or (origem_id = 63)
      order by id desc
      limit 200
    $q$;
  exception when undefined_column then
    raise notice 'Colunas cobrancas.origem_id/origem_tipo não existem (ou uma delas). Pulando parte da busca.';
    execute $q2$
      select *
      from public.cobrancas
      where (descricao ilike '%matr%' and descricao ilike '%63%')
      order by id desc
      limit 200
    $q2$;
  end;

end $$;

-- Lançamentos do Cartão Conexão (se existir)
do $$
begin
  if to_regclass('public.credito_conexao_lancamentos') is not null then
    execute $q$
      select *
      from public.credito_conexao_lancamentos
      where origem_id = 63
         or (descricao ilike '%matr%' and descricao ilike '%63%')
      order by id desc
      limit 200
    $q$;
  else
    raise notice 'Tabela public.credito_conexao_lancamentos não existe. Pulando.';
  end if;
end $$;

-- =========================
-- D) FIX CONTROLADO (CRIAR A PARTE “FAMÍLIA” = 50%)
-- =========================
-- valor mensal total = 22000 centavos
-- parte família (50%) = 11000 centavos

do $$
declare
  v_matricula_id bigint := 63;
  v_valor_familia_centavos integer := 11000;
  v_existe boolean := false;
  v_cobranca_id bigint;
  v_competencia text := to_char(current_date, 'YYYY-MM');
begin
  -- idempotência: tenta achar cobrança equivalente
  begin
    select true into v_existe
    from public.cobrancas c
    where (
        (c.matricula_id = v_matricula_id)
        or (c.origem_id = v_matricula_id and c.origem_tipo ilike '%MATRIC%')
        or (c.descricao ilike '%matr%' and c.descricao ilike '%63%')
      )
      and c.valor_centavos = v_valor_familia_centavos
    limit 1;
  exception when undefined_column then
    select true into v_existe
    from public.cobrancas c
    where (c.descricao ilike '%matr%' and c.descricao ilike '%63%')
      and c.valor_centavos = v_valor_familia_centavos
    limit 1;
  end;

  if coalesce(v_existe,false) then
    raise notice 'Cobrança de parte família (R$ 110,00) já existe. Nenhuma criação necessária.';
    return;
  end if;

  -- tenta inserir com colunas avançadas
  begin
    insert into public.cobrancas (
      pessoa_id,
      descricao,
      valor_centavos,
      moeda,
      vencimento,
      status,
      origem_tipo,
      origem_id,
      competencia_ano_mes,
      matricula_id
    )
    select
      m.responsavel_financeiro_id,
      'Matrícula #63 — Parte família (50% da mensalidade) — Bolsa parcial 50%',
      v_valor_familia_centavos,
      'BRL',
      current_date,
      'PENDENTE',
      'MATRICULA_BOLSA_PARCIAL',
      v_matricula_id,
      v_competencia,
      v_matricula_id
    from public.matriculas m
    where m.id = v_matricula_id
    returning id into v_cobranca_id;

    raise notice 'Cobrança criada (parte família) id=%', v_cobranca_id;

  exception when undefined_column then
    -- fallback minimalista
    insert into public.cobrancas (
      pessoa_id,
      descricao,
      valor_centavos,
      moeda,
      vencimento,
      status
    )
    select
      m.responsavel_financeiro_id,
      'Matrícula #63 — Parte família (50% da mensalidade) — Bolsa parcial 50%',
      v_valor_familia_centavos,
      'BRL',
      current_date,
      'PENDENTE'
    from public.matriculas m
    where m.id = v_matricula_id
    returning id into v_cobranca_id;

    raise notice 'Cobrança criada (fallback) id=%', v_cobranca_id;
  end;

end $$;

-- =========================
-- E) SAÍDA FINAL PARA CONFERÊNCIA
-- =========================
select *
from public.cobrancas
where (descricao ilike '%matr%' and descricao ilike '%63%')
order by id desc
limit 50;

commit;
