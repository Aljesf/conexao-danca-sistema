begin;

-- ============================================================
-- Backfill conservador de matricula_itens para matriculas legadas
-- ============================================================
-- Objetivos:
-- 1) popular public.matricula_itens para matriculas antigas sem item granular
-- 2) preencher turma_aluno.matricula_item_id apenas quando a correspondencia for segura
-- 3) nao criar nem alterar cobrancas, recebimentos ou faturamento nesta etapa
--
-- Estrategia desta rodada:
-- - 1 matricula legada -> 1 item legado minimo
-- - origem_tipo = 'LEGADO'
-- - curso_id/modulo_id permanecem nulos quando nao houver resolucao segura
-- - valores financeiros ficam zerados para nao inventar granularidade historica

with turma_operacional as (
  select
    ta.matricula_id,
    count(distinct ta.turma_id) filter (where ta.turma_id is not null and ta.dt_fim is null) as total_turmas_ativas,
    min(ta.turma_id) filter (where ta.turma_id is not null and ta.dt_fim is null) as turma_id_unica_ativa
  from public.turma_aluno ta
  where ta.matricula_id is not null
  group by ta.matricula_id
),
candidatas as (
  select
    m.id as matricula_id,
    m.pessoa_id,
    null::bigint as curso_id,
    null::bigint as modulo_id,
    coalesce(
      m.vinculo_id,
      case
        when coalesce(toa.total_turmas_ativas, 0) = 1 then toa.turma_id_unica_ativa
        else null
      end
    ) as turma_id_inicial,
    case
      when nullif(btrim(coalesce(pe.titulo, '')), '') is not null then
        'Item legado - ' || btrim(pe.titulo)
      when nullif(btrim(coalesce(tp.nome, '')), '') is not null then
        'Item legado - ' || btrim(tp.nome)
      else
        'Item legado da matricula #' || m.id::text
    end as descricao,
    'LEGADO'::text as origem_tipo,
    0::integer as valor_base_centavos,
    0::integer as valor_liquido_centavos,
    case
      when upper(coalesce(m.status::text, '')) = 'CANCELADA' then 'CANCELADO'
      when upper(coalesce(m.status::text, '')) in ('CONCLUIDA', 'ENCERRADA') then 'ENCERRADO'
      else 'ATIVO'
    end as status,
    coalesce(
      m.data_inicio_vinculo,
      m.data_matricula,
      m.created_at::date,
      current_date
    ) as data_inicio,
    case
      when upper(coalesce(m.status::text, '')) in ('CANCELADA', 'CONCLUIDA', 'ENCERRADA') then
        coalesce(
          m.data_encerramento,
          m.encerramento_em::date,
          m.updated_at::date
        )
      else
        null
    end as data_fim,
    case
      when upper(coalesce(m.status::text, '')) = 'CANCELADA' then coalesce(nullif(btrim(coalesce(m.cancelamento_tipo, '')), ''), 'LEGADO')
      else null
    end as cancelamento_tipo,
    'Backfill legado automatico em 2026-03-25'::text as observacoes
  from public.matriculas m
  left join turma_operacional toa
    on toa.matricula_id = m.id
  left join public.turmas tp
    on tp.turma_id = coalesce(
      m.vinculo_id,
      case
        when coalesce(toa.total_turmas_ativas, 0) = 1 then toa.turma_id_unica_ativa
        else null
      end
    )
  left join public.escola_produtos_educacionais pe
    on pe.id = coalesce(m.servico_id, m.produto_id)
  where upper(coalesce(m.status::text, '')) in ('ATIVA', 'CANCELADA', 'CONCLUIDA', 'ENCERRADA')
    and not exists (
      select 1
      from public.matricula_itens mi
      where mi.matricula_id = m.id
    )
),
inseridos as (
  insert into public.matricula_itens (
    matricula_id,
    curso_id,
    modulo_id,
    turma_id_inicial,
    descricao,
    origem_tipo,
    valor_base_centavos,
    valor_liquido_centavos,
    status,
    data_inicio,
    data_fim,
    cancelamento_tipo,
    observacoes
  )
  select
    c.matricula_id,
    c.curso_id,
    c.modulo_id,
    c.turma_id_inicial,
    c.descricao,
    c.origem_tipo,
    c.valor_base_centavos,
    c.valor_liquido_centavos,
    c.status,
    c.data_inicio,
    c.data_fim,
    c.cancelamento_tipo,
    c.observacoes
  from candidatas c
  returning id, matricula_id, turma_id_inicial
),
item_legado_unico as (
  select
    mi.id as matricula_item_id,
    mi.matricula_id,
    mi.turma_id_inicial,
    m.pessoa_id
  from public.matricula_itens mi
  join public.matriculas m
    on m.id = mi.matricula_id
  where mi.origem_tipo = 'LEGADO'
    and not exists (
      select 1
      from public.matricula_itens mi2
      where mi2.matricula_id = mi.matricula_id
        and mi2.id <> mi.id
    )
),
pares_legados_unicos as (
  select
    ilu.pessoa_id,
    ilu.turma_id_inicial
  from item_legado_unico ilu
  where ilu.pessoa_id is not null
    and ilu.turma_id_inicial is not null
  group by ilu.pessoa_id, ilu.turma_id_inicial
  having count(*) = 1
),
atualiza_por_matricula as (
  update public.turma_aluno ta
  set matricula_item_id = ilu.matricula_item_id
  from item_legado_unico ilu
  where ta.matricula_item_id is null
    and ta.matricula_id = ilu.matricula_id
  returning ta.turma_aluno_id
),
atualiza_por_aluno_turma as (
  update public.turma_aluno ta
  set
    matricula_item_id = ilu.matricula_item_id,
    matricula_id = coalesce(ta.matricula_id, ilu.matricula_id)
  from item_legado_unico ilu
  join pares_legados_unicos plu
    on plu.pessoa_id = ilu.pessoa_id
   and plu.turma_id_inicial = ilu.turma_id_inicial
  where ta.matricula_item_id is null
    and ta.matricula_id is null
    and ta.aluno_pessoa_id = ilu.pessoa_id
    and ta.turma_id = ilu.turma_id_inicial
  returning ta.turma_aluno_id
)
select count(*) as itens_legados_inseridos
from inseridos;

with item_legado_unico as (
  select
    mi.id as matricula_item_id,
    mi.matricula_id
  from public.matricula_itens mi
  where mi.origem_tipo = 'LEGADO'
    and not exists (
      select 1
      from public.matricula_itens mi2
      where mi2.matricula_id = mi.matricula_id
        and mi2.id <> mi.id
    )
)
update public.turma_aluno ta
set matricula_item_id = ilu.matricula_item_id
from item_legado_unico ilu
where ta.matricula_item_id is null
  and ta.matricula_id = ilu.matricula_id;

with item_legado_unico as (
  select
    mi.id as matricula_item_id,
    mi.matricula_id,
    mi.turma_id_inicial,
    m.pessoa_id
  from public.matricula_itens mi
  join public.matriculas m
    on m.id = mi.matricula_id
  where mi.origem_tipo = 'LEGADO'
    and not exists (
      select 1
      from public.matricula_itens mi2
      where mi2.matricula_id = mi.matricula_id
        and mi2.id <> mi.id
    )
),
pares_legados_unicos as (
  select
    ilu.pessoa_id,
    ilu.turma_id_inicial
  from item_legado_unico ilu
  where ilu.pessoa_id is not null
    and ilu.turma_id_inicial is not null
  group by ilu.pessoa_id, ilu.turma_id_inicial
  having count(*) = 1
)
update public.turma_aluno ta
set
  matricula_item_id = ilu.matricula_item_id,
  matricula_id = coalesce(ta.matricula_id, ilu.matricula_id)
from item_legado_unico ilu
join pares_legados_unicos plu
  on plu.pessoa_id = ilu.pessoa_id
 and plu.turma_id_inicial = ilu.turma_id_inicial
where ta.matricula_item_id is null
  and ta.matricula_id is null
  and ta.aluno_pessoa_id = ilu.pessoa_id
  and ta.turma_id = ilu.turma_id_inicial;

select
  (select count(*) from public.matricula_itens) as total_matricula_itens,
  (select count(*) from public.turma_aluno where matricula_item_id is not null) as total_turma_aluno_com_item;

-- ============================================================
-- Consultas de verificacao sugeridas apos a aplicacao
-- ============================================================
-- select count(*) as total_matriculas_com_item from public.matricula_itens;
-- select count(*) as total_turma_aluno_com_item from public.turma_aluno where matricula_item_id is not null;
-- select * from public.matricula_itens where matricula_id in (29, 49) order by matricula_id, id;
-- select turma_aluno_id, matricula_id, matricula_item_id, turma_id, aluno_pessoa_id, status
-- from public.turma_aluno
-- where matricula_id in (29, 49)
-- order by matricula_id, turma_aluno_id;

commit;
