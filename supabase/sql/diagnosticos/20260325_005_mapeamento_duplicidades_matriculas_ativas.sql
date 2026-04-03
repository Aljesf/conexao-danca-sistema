-- Diagnostico reutilizavel das duplicidades historicas de matriculas ATIVAS.
-- Objetivo: mapear pessoas com mais de uma matricula ATIVA, detalhar a camada
-- operacional/financeira por matricula e sugerir uma acao tecnica conservadora.
--
-- Observacoes:
-- 1) O diagnostico nao altera dados.
-- 2) "total_cobrancas_centavos" representa a soma de todas as cobrancas ligadas
--    diretamente a matricula ou aos seus itens, nao apenas saldo em aberto.
-- 3) "qtd_lancamentos_cartao_conexao" e "competencias_encontradas" consideram
--    lancamentos diretos por matricula ou por referencia_item dos matricula_itens.

-- ============================================================
-- BLOCO BASE
-- ============================================================
-- Este CTE e repetido nos selects abaixo para manter o arquivo copiavel e
-- executavel em blocos isolados.

-- ============================================================
-- 1) LISTA BASE DAS PESSOAS COM DUPLICIDADE DE MATRICULA ATIVA
-- ============================================================
with pessoas_duplicadas as (
  select
    m.pessoa_id
  from public.matriculas m
  where m.status = 'ATIVA'
  group by m.pessoa_id
  having count(*) > 1
),
matriculas_base as (
  select
    m.id as matricula_id,
    m.pessoa_id,
    aluno.nome as nome_aluno,
    responsavel.nome as responsavel_nome,
    m.status::text as status,
    m.tipo_matricula::text as tipo_matricula,
    m.ano_referencia,
    m.data_matricula,
    m.data_inicio_vinculo,
    m.data_encerramento,
    m.created_at,
    m.updated_at,
    m.total_mensalidade_centavos,
    m.vinculo_id,
    turma_vinculo.nome as turma_vinculo_nome
  from public.matriculas m
  join pessoas_duplicadas pd
    on pd.pessoa_id = m.pessoa_id
  left join public.pessoas aluno
    on aluno.id = m.pessoa_id
  left join public.pessoas responsavel
    on responsavel.id = m.responsavel_financeiro_id
  left join public.turmas turma_vinculo
    on turma_vinculo.turma_id = m.vinculo_id
  where m.status = 'ATIVA'
),
matricula_itens_agg as (
  select
    mb.matricula_id,
    count(mi.id) as quantidade_matricula_itens,
    count(mi.id) filter (where mi.origem_tipo = 'LEGADO') as quantidade_itens_legado,
    coalesce(array_agg(mi.id order by mi.id) filter (where mi.id is not null), '{}'::bigint[]) as ids_itens,
    coalesce(array_agg(mi.descricao order by mi.id) filter (where mi.id is not null), '{}'::text[]) as descricoes_itens,
    coalesce(array_agg(mi.status order by mi.id) filter (where mi.id is not null), '{}'::text[]) as status_itens,
    coalesce(array_agg(mi.valor_base_centavos order by mi.id) filter (where mi.id is not null), '{}'::integer[]) as valores_base_itens_centavos,
    coalesce(array_agg(mi.valor_liquido_centavos order by mi.id) filter (where mi.id is not null), '{}'::integer[]) as valores_liquidos_itens_centavos,
    coalesce(array_agg(ti.nome order by mi.id) filter (where mi.id is not null), '{}'::text[]) as turmas_iniciais
  from matriculas_base mb
  left join public.matricula_itens mi
    on mi.matricula_id = mb.matricula_id
  left join public.turmas ti
    on ti.turma_id = mi.turma_id_inicial
  group by mb.matricula_id
),
turma_operacional_agg as (
  select
    mb.matricula_id,
    count(ta.turma_aluno_id) as quantidade_turmas_operacionais,
    coalesce(array_agg(distinct ta.turma_aluno_id) filter (where ta.turma_aluno_id is not null), '{}'::bigint[]) as ids_turma_aluno,
    coalesce(array_agg(distinct toper.nome) filter (where toper.nome is not null), '{}'::text[]) as turmas_operacionais
  from matriculas_base mb
  left join public.turma_aluno ta
    on ta.matricula_id = mb.matricula_id
  left join public.turmas toper
    on toper.turma_id = ta.turma_id
  group by mb.matricula_id
),
financeiro_agg as (
  select
    mb.matricula_id,
    coalesce(cobrancas.qtd_cobrancas, 0) as quantidade_cobrancas_vinculadas,
    coalesce(cobrancas.total_cobrancas_centavos, 0) as total_cobrancas_centavos,
    coalesce(recebimentos.qtd_recebimentos, 0) as quantidade_recebimentos,
    coalesce(recebimentos.total_recebido_centavos, 0) as total_recebido_centavos,
    coalesce(lancamentos.qtd_lancamentos, 0) as quantidade_lancamentos_cartao_conexao,
    coalesce(lancamentos.total_lancamentos_centavos, 0) as total_lancamentos_centavos,
    coalesce(lancamentos.competencias_encontradas, '{}'::text[]) as competencias_encontradas
  from matriculas_base mb
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    )
    select
      count(*) as qtd_cobrancas,
      coalesce(sum(c.valor_centavos), 0) as total_cobrancas_centavos
    from public.cobrancas c
    where (c.origem_tipo = 'MATRICULA' and c.origem_id = mb.matricula_id)
       or (c.origem_item_tipo = 'MATRICULA_ITEM' and c.origem_item_id in (select id from item_ids))
  ) cobrancas on true
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    ),
    cobrancas_rel as (
      select c.id
      from public.cobrancas c
      where (c.origem_tipo = 'MATRICULA' and c.origem_id = mb.matricula_id)
         or (c.origem_item_tipo = 'MATRICULA_ITEM' and c.origem_item_id in (select id from item_ids))
    )
    select
      count(*) as qtd_recebimentos,
      coalesce(sum(r.valor_centavos), 0) as total_recebido_centavos
    from public.recebimentos r
    where r.cobranca_id in (select id from cobrancas_rel)
  ) recebimentos on true
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    )
    select
      count(*) as qtd_lancamentos,
      coalesce(sum(l.valor_centavos), 0) as total_lancamentos_centavos,
      coalesce(array_agg(distinct l.competencia order by l.competencia) filter (where l.competencia is not null), '{}'::text[]) as competencias_encontradas
    from public.credito_conexao_lancamentos l
    where l.matricula_id = mb.matricula_id
       or exists (
         select 1
         from item_ids i
         where l.referencia_item like ('matricula-item:' || i.id || ':%')
       )
  ) lancamentos on true
),
matriculas_detalhadas as (
  select
    mb.*,
    mi.quantidade_matricula_itens,
    mi.quantidade_itens_legado,
    mi.ids_itens,
    mi.descricoes_itens,
    mi.status_itens,
    mi.valores_base_itens_centavos,
    mi.valores_liquidos_itens_centavos,
    mi.turmas_iniciais,
    toper.quantidade_turmas_operacionais,
    toper.ids_turma_aluno,
    toper.turmas_operacionais,
    fin.quantidade_cobrancas_vinculadas,
    fin.total_cobrancas_centavos,
    fin.quantidade_recebimentos,
    fin.total_recebido_centavos,
    fin.quantidade_lancamentos_cartao_conexao,
    fin.total_lancamentos_centavos,
    fin.competencias_encontradas,
    min(mb.data_matricula) over (partition by mb.pessoa_id) as matricula_mais_antiga,
    max(mb.data_matricula) over (partition by mb.pessoa_id) as matricula_mais_recente,
    (coalesce(fin.quantidade_cobrancas_vinculadas, 0) > 0
      or coalesce(fin.quantidade_recebimentos, 0) > 0
      or coalesce(fin.quantidade_lancamentos_cartao_conexao, 0) > 0) as tem_financeiro,
    (coalesce(mi.quantidade_matricula_itens, 0) > 0) as tem_item_granular,
    (coalesce(toper.quantidade_turmas_operacionais, 0) > 0) as tem_turma_operacional,
    (coalesce(mi.quantidade_itens_legado, 0) > 0 or coalesce(mi.quantidade_matricula_itens, 0) = 0) as parece_legado,
    (
      mb.nome_aluno ilike '%teste%'
      or exists (
        select 1
        from unnest(mi.descricoes_itens) as descricao_item
        where descricao_item ilike '%teste%'
      )
    ) as parece_teste,
    (
      coalesce(fin.quantidade_cobrancas_vinculadas, 0) = 0
      and coalesce(fin.quantidade_recebimentos, 0) = 0
      and coalesce(fin.quantidade_lancamentos_cartao_conexao, 0) = 0
      and coalesce(toper.quantidade_turmas_operacionais, 0) = 0
    ) as parece_duplicada_sem_uso
  from matriculas_base mb
  left join matricula_itens_agg mi
    on mi.matricula_id = mb.matricula_id
  left join turma_operacional_agg toper
    on toper.matricula_id = mb.matricula_id
  left join financeiro_agg fin
    on fin.matricula_id = mb.matricula_id
),
pessoas_resumo as (
  select
    md.pessoa_id,
    md.nome_aluno,
    count(*) as quantidade_matriculas_ativas,
    array_agg(md.matricula_id order by md.data_matricula nulls last, md.matricula_id) as ids_matriculas_ativas,
    min(md.data_matricula) as data_matricula_mais_antiga,
    max(md.data_matricula) as data_matricula_mais_recente,
    count(*) filter (where md.tem_financeiro) as matriculas_com_financeiro,
    count(*) filter (where md.tem_item_granular) as matriculas_com_item_granular,
    count(*) filter (where md.tem_turma_operacional) as matriculas_com_turma_operacional,
    bool_or(md.parece_legado) as parece_legado,
    bool_or(md.parece_teste) as parece_teste,
    bool_or(md.parece_duplicada_sem_uso) as parece_duplicada_sem_uso,
    case
      when bool_or(md.parece_teste) then 'POSSIVEL_TESTE'
      when count(*) filter (where md.parece_duplicada_sem_uso) = 1
        and count(*) filter (where md.tem_financeiro or md.tem_turma_operacional) >= 1
        then 'MANTER_E_REMOVER_OUTRA'
      when bool_or(md.parece_duplicada_sem_uso) then 'POSSIVEL_LEGADO_SEM_USO'
      when count(*) filter (where md.tem_financeiro) = count(*) then 'ANALISE_MANUAL_OBRIGATORIA'
      when count(*) filter (where md.tem_financeiro) >= 1 then 'ANALISE_MANUAL_OBRIGATORIA'
      else 'NAO_CLASSIFICADO'
    end as sugestao_tecnica_acao
  from matriculas_detalhadas md
  group by md.pessoa_id, md.nome_aluno
)
select
  pr.pessoa_id,
  pr.nome_aluno,
  pr.quantidade_matriculas_ativas,
  pr.ids_matriculas_ativas,
  pr.data_matricula_mais_antiga,
  pr.data_matricula_mais_recente,
  pr.matriculas_com_financeiro,
  pr.matriculas_com_item_granular,
  pr.matriculas_com_turma_operacional,
  pr.parece_legado,
  pr.parece_teste,
  pr.parece_duplicada_sem_uso,
  pr.sugestao_tecnica_acao
from pessoas_resumo pr
order by pr.nome_aluno;

-- ============================================================
-- 2) DETALHAMENTO COMPLETO POR MATRICULA
-- ============================================================
with pessoas_duplicadas as (
  select
    m.pessoa_id
  from public.matriculas m
  where m.status = 'ATIVA'
  group by m.pessoa_id
  having count(*) > 1
),
matriculas_base as (
  select
    m.id as matricula_id,
    m.pessoa_id,
    aluno.nome as nome_aluno,
    responsavel.nome as responsavel_nome,
    m.status::text as status,
    m.tipo_matricula::text as tipo_matricula,
    m.ano_referencia,
    m.data_matricula,
    m.data_inicio_vinculo,
    m.data_encerramento,
    m.created_at,
    m.updated_at,
    m.total_mensalidade_centavos,
    m.vinculo_id,
    turma_vinculo.nome as turma_vinculo_nome
  from public.matriculas m
  join pessoas_duplicadas pd
    on pd.pessoa_id = m.pessoa_id
  left join public.pessoas aluno
    on aluno.id = m.pessoa_id
  left join public.pessoas responsavel
    on responsavel.id = m.responsavel_financeiro_id
  left join public.turmas turma_vinculo
    on turma_vinculo.turma_id = m.vinculo_id
  where m.status = 'ATIVA'
),
matricula_itens_agg as (
  select
    mb.matricula_id,
    count(mi.id) as quantidade_matricula_itens,
    count(mi.id) filter (where mi.origem_tipo = 'LEGADO') as quantidade_itens_legado,
    coalesce(array_agg(mi.id order by mi.id) filter (where mi.id is not null), '{}'::bigint[]) as ids_itens,
    coalesce(array_agg(mi.descricao order by mi.id) filter (where mi.id is not null), '{}'::text[]) as descricoes_itens,
    coalesce(array_agg(mi.status order by mi.id) filter (where mi.id is not null), '{}'::text[]) as status_itens,
    coalesce(array_agg(mi.valor_base_centavos order by mi.id) filter (where mi.id is not null), '{}'::integer[]) as valores_base_itens_centavos,
    coalesce(array_agg(mi.valor_liquido_centavos order by mi.id) filter (where mi.id is not null), '{}'::integer[]) as valores_liquidos_itens_centavos,
    coalesce(array_agg(ti.nome order by mi.id) filter (where mi.id is not null), '{}'::text[]) as turmas_iniciais
  from matriculas_base mb
  left join public.matricula_itens mi
    on mi.matricula_id = mb.matricula_id
  left join public.turmas ti
    on ti.turma_id = mi.turma_id_inicial
  group by mb.matricula_id
),
turma_operacional_agg as (
  select
    mb.matricula_id,
    count(ta.turma_aluno_id) as quantidade_turmas_operacionais,
    coalesce(array_agg(distinct ta.turma_aluno_id) filter (where ta.turma_aluno_id is not null), '{}'::bigint[]) as ids_turma_aluno,
    coalesce(array_agg(distinct toper.nome) filter (where toper.nome is not null), '{}'::text[]) as turmas_operacionais
  from matriculas_base mb
  left join public.turma_aluno ta
    on ta.matricula_id = mb.matricula_id
  left join public.turmas toper
    on toper.turma_id = ta.turma_id
  group by mb.matricula_id
),
financeiro_agg as (
  select
    mb.matricula_id,
    coalesce(cobrancas.qtd_cobrancas, 0) as quantidade_cobrancas_vinculadas,
    coalesce(cobrancas.total_cobrancas_centavos, 0) as total_cobrancas_centavos,
    coalesce(recebimentos.qtd_recebimentos, 0) as quantidade_recebimentos,
    coalesce(recebimentos.total_recebido_centavos, 0) as total_recebido_centavos,
    coalesce(lancamentos.qtd_lancamentos, 0) as quantidade_lancamentos_cartao_conexao,
    coalesce(lancamentos.total_lancamentos_centavos, 0) as total_lancamentos_centavos,
    coalesce(lancamentos.competencias_encontradas, '{}'::text[]) as competencias_encontradas
  from matriculas_base mb
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    )
    select
      count(*) as qtd_cobrancas,
      coalesce(sum(c.valor_centavos), 0) as total_cobrancas_centavos
    from public.cobrancas c
    where (c.origem_tipo = 'MATRICULA' and c.origem_id = mb.matricula_id)
       or (c.origem_item_tipo = 'MATRICULA_ITEM' and c.origem_item_id in (select id from item_ids))
  ) cobrancas on true
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    ),
    cobrancas_rel as (
      select c.id
      from public.cobrancas c
      where (c.origem_tipo = 'MATRICULA' and c.origem_id = mb.matricula_id)
         or (c.origem_item_tipo = 'MATRICULA_ITEM' and c.origem_item_id in (select id from item_ids))
    )
    select
      count(*) as qtd_recebimentos,
      coalesce(sum(r.valor_centavos), 0) as total_recebido_centavos
    from public.recebimentos r
    where r.cobranca_id in (select id from cobrancas_rel)
  ) recebimentos on true
  left join lateral (
    with item_ids as (
      select mi.id
      from public.matricula_itens mi
      where mi.matricula_id = mb.matricula_id
    )
    select
      count(*) as qtd_lancamentos,
      coalesce(sum(l.valor_centavos), 0) as total_lancamentos_centavos,
      coalesce(array_agg(distinct l.competencia order by l.competencia) filter (where l.competencia is not null), '{}'::text[]) as competencias_encontradas
    from public.credito_conexao_lancamentos l
    where l.matricula_id = mb.matricula_id
       or exists (
         select 1
         from item_ids i
         where l.referencia_item like ('matricula-item:' || i.id || ':%')
       )
  ) lancamentos on true
),
matriculas_detalhadas as (
  select
    mb.*,
    mi.quantidade_matricula_itens,
    mi.quantidade_itens_legado,
    mi.ids_itens,
    mi.descricoes_itens,
    mi.status_itens,
    mi.valores_base_itens_centavos,
    mi.valores_liquidos_itens_centavos,
    mi.turmas_iniciais,
    toper.quantidade_turmas_operacionais,
    toper.ids_turma_aluno,
    toper.turmas_operacionais,
    fin.quantidade_cobrancas_vinculadas,
    fin.total_cobrancas_centavos,
    fin.quantidade_recebimentos,
    fin.total_recebido_centavos,
    fin.quantidade_lancamentos_cartao_conexao,
    fin.total_lancamentos_centavos,
    fin.competencias_encontradas,
    min(mb.data_matricula) over (partition by mb.pessoa_id) as matricula_mais_antiga,
    max(mb.data_matricula) over (partition by mb.pessoa_id) as matricula_mais_recente,
    (coalesce(fin.quantidade_cobrancas_vinculadas, 0) > 0
      or coalesce(fin.quantidade_recebimentos, 0) > 0
      or coalesce(fin.quantidade_lancamentos_cartao_conexao, 0) > 0) as tem_financeiro,
    (coalesce(mi.quantidade_matricula_itens, 0) > 0) as tem_item_granular,
    (coalesce(toper.quantidade_turmas_operacionais, 0) > 0) as tem_turma_operacional,
    (coalesce(mi.quantidade_itens_legado, 0) > 0 or coalesce(mi.quantidade_matricula_itens, 0) = 0) as parece_legado,
    (
      mb.nome_aluno ilike '%teste%'
      or exists (
        select 1
        from unnest(mi.descricoes_itens) as descricao_item
        where descricao_item ilike '%teste%'
      )
    ) as parece_teste,
    (
      coalesce(fin.quantidade_cobrancas_vinculadas, 0) = 0
      and coalesce(fin.quantidade_recebimentos, 0) = 0
      and coalesce(fin.quantidade_lancamentos_cartao_conexao, 0) = 0
      and coalesce(toper.quantidade_turmas_operacionais, 0) = 0
    ) as parece_duplicada_sem_uso
  from matriculas_base mb
  left join matricula_itens_agg mi
    on mi.matricula_id = mb.matricula_id
  left join turma_operacional_agg toper
    on toper.matricula_id = mb.matricula_id
  left join financeiro_agg fin
    on fin.matricula_id = mb.matricula_id
),
pessoas_resumo as (
  select
    md.pessoa_id,
    case
      when bool_or(md.parece_teste) then 'POSSIVEL_TESTE'
      when count(*) filter (where md.parece_duplicada_sem_uso) = 1
        and count(*) filter (where md.tem_financeiro or md.tem_turma_operacional) >= 1
        then 'MANTER_E_REMOVER_OUTRA'
      when bool_or(md.parece_duplicada_sem_uso) then 'POSSIVEL_LEGADO_SEM_USO'
      when count(*) filter (where md.tem_financeiro) = count(*) then 'ANALISE_MANUAL_OBRIGATORIA'
      when count(*) filter (where md.tem_financeiro) >= 1 then 'ANALISE_MANUAL_OBRIGATORIA'
      else 'NAO_CLASSIFICADO'
    end as sugestao_tecnica_acao
  from matriculas_detalhadas md
  group by md.pessoa_id
)
select
  md.matricula_id,
  md.pessoa_id,
  md.nome_aluno,
  md.responsavel_nome,
  md.status,
  md.tipo_matricula,
  md.ano_referencia,
  md.data_matricula,
  md.data_inicio_vinculo,
  md.data_encerramento,
  md.created_at,
  md.updated_at,
  md.quantidade_matricula_itens,
  md.ids_itens,
  md.descricoes_itens,
  md.status_itens,
  md.valores_base_itens_centavos,
  md.valores_liquidos_itens_centavos,
  md.turmas_iniciais,
  md.quantidade_turmas_operacionais,
  md.ids_turma_aluno,
  md.turmas_operacionais,
  md.quantidade_cobrancas_vinculadas,
  md.total_cobrancas_centavos,
  md.quantidade_recebimentos,
  md.total_recebido_centavos,
  md.quantidade_lancamentos_cartao_conexao,
  md.total_lancamentos_centavos,
  md.competencias_encontradas,
  md.matricula_mais_antiga,
  md.matricula_mais_recente,
  md.tem_financeiro,
  md.tem_item_granular,
  md.tem_turma_operacional,
  md.parece_legado,
  md.parece_teste,
  md.parece_duplicada_sem_uso,
  pr.sugestao_tecnica_acao
from matriculas_detalhadas md
join pessoas_resumo pr
  on pr.pessoa_id = md.pessoa_id
order by md.nome_aluno, md.data_matricula nulls last, md.matricula_id;

-- ============================================================
-- 3) APOIO A ANALISE MANUAL: PRIORIZACAO CONSERVADORA
-- ============================================================
-- Ordena primeiro:
-- 1) matriculas sem uso operacional nem financeiro;
-- 2) casos sem recebimento;
-- 3) casos sem turma operacional;
-- 4) casos marcados como legado.
with pessoas_duplicadas as (
  select
    m.pessoa_id
  from public.matriculas m
  where m.status = 'ATIVA'
  group by m.pessoa_id
  having count(*) > 1
),
base as (
  select
    m.id as matricula_id,
    m.pessoa_id,
    p.nome as nome_aluno,
    m.data_matricula,
    exists (
      select 1
      from public.turma_aluno ta
      where ta.matricula_id = m.id
    ) as tem_turma_operacional,
    exists (
      select 1
      from public.matricula_itens mi
      where mi.matricula_id = m.id
    ) as tem_item_granular,
    exists (
      select 1
      from public.matricula_itens mi
      where mi.matricula_id = m.id
        and mi.origem_tipo = 'LEGADO'
    ) as parece_legado,
    exists (
      select 1
      from public.cobrancas c
      where c.origem_tipo = 'MATRICULA'
        and c.origem_id = m.id
    ) as tem_cobranca,
    exists (
      select 1
      from public.recebimentos r
      join public.cobrancas c
        on c.id = r.cobranca_id
      where c.origem_tipo = 'MATRICULA'
        and c.origem_id = m.id
    ) as tem_recebimento,
    exists (
      select 1
      from public.credito_conexao_lancamentos l
      where l.matricula_id = m.id
    ) as tem_lancamento_cartao
  from public.matriculas m
  join pessoas_duplicadas pd
    on pd.pessoa_id = m.pessoa_id
  left join public.pessoas p
    on p.id = m.pessoa_id
  where m.status = 'ATIVA'
)
select
  b.pessoa_id,
  b.nome_aluno,
  b.matricula_id,
  b.data_matricula,
  b.tem_item_granular,
  b.tem_turma_operacional,
  b.tem_cobranca,
  b.tem_recebimento,
  b.tem_lancamento_cartao,
  b.parece_legado,
  case
    when not b.tem_turma_operacional and not b.tem_cobranca and not b.tem_recebimento and not b.tem_lancamento_cartao then 1
    when not b.tem_recebimento and not b.tem_lancamento_cartao then 2
    when not b.tem_turma_operacional then 3
    when b.parece_legado then 4
    else 9
  end as prioridade_saneamento
from base b
order by prioridade_saneamento, b.nome_aluno, b.data_matricula nulls last, b.matricula_id;
