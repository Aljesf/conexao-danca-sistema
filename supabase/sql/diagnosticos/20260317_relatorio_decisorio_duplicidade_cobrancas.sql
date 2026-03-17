with faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
),
base as (
  select
    c.id as cobranca_id,
    c.pessoa_id,
    p.nome as pessoa_nome,
    c.competencia_ano_mes,
    c.valor_centavos,
    c.origem_tipo,
    c.origem_id,
    case
      when coalesce(fpc.qtd_faturas, 0) > 0 then 1
      else 0
    end as possui_fatura
  from public.cobrancas c
  left join public.pessoas p
    on p.id = c.pessoa_id
  left join faturas_por_cobranca fpc
    on fpc.cobranca_id = c.id
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_duplicados as (
  select
    b.pessoa_id,
    b.pessoa_nome,
    b.competencia_ano_mes,
    b.valor_centavos,
    count(*) as quantidade_cobrancas,
    array_agg(b.cobranca_id order by b.cobranca_id) as cobrancas_ids,
    count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'MATRICULA') as qtd_origem_matricula,
    count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') as qtd_origem_fatura_credito_conexao,
    sum(b.possui_fatura) as qtd_com_fatura,
    count(*) - sum(b.possui_fatura) as qtd_sem_fatura,
    min(b.cobranca_id) as menor_id,
    max(b.cobranca_id) as maior_id,
    array_agg(b.cobranca_id order by b.cobranca_id) filter (where b.possui_fatura = 1) as ids_com_fatura,
    array_agg(b.cobranca_id order by b.cobranca_id) filter (where b.possui_fatura = 0) as ids_sem_fatura
  from base b
  group by
    b.pessoa_id,
    b.pessoa_nome,
    b.competencia_ano_mes,
    b.valor_centavos
  having count(*) > 1
)
select
  concat_ws(
    ' | ',
    gd.pessoa_id::text,
    coalesce(gd.competencia_ano_mes, '<NULL>'),
    gd.valor_centavos::text
  ) as grupo_chave_texto,
  gd.pessoa_id,
  gd.pessoa_nome,
  gd.competencia_ano_mes,
  gd.valor_centavos,
  gd.quantidade_cobrancas,
  gd.cobrancas_ids,
  gd.qtd_origem_matricula,
  gd.qtd_origem_fatura_credito_conexao,
  gd.qtd_com_fatura,
  gd.qtd_sem_fatura,
  gd.menor_id,
  gd.maior_id,
  gd.ids_com_fatura,
  gd.ids_sem_fatura,
  case
    when gd.quantidade_cobrancas >= 3 then 'TRIPLA_OU_MAIS'
    when gd.qtd_origem_matricula >= 1
     and gd.qtd_origem_fatura_credito_conexao >= 1
     and gd.quantidade_cobrancas = 2 then 'MATRICULA_X_FATURA'
    when gd.quantidade_cobrancas = 2
     and gd.qtd_origem_fatura_credito_conexao = 2 then 'FATURA_DUPLA'
    else 'OUTRO'
  end as classificacao_grupo,
  case
    when gd.quantidade_cobrancas >= 3 then 'REVISAO_MANUAL_TRIPLA'
    when gd.qtd_origem_matricula >= 1
     and gd.qtd_origem_fatura_credito_conexao >= 1
     and gd.quantidade_cobrancas = 2 then 'MANTER_FATURA_E_REVISAR_MATRICULA'
    when gd.quantidade_cobrancas = 2
     and gd.qtd_origem_fatura_credito_conexao = 2 then 'REVISAO_MANUAL_DUPLA_FATURA'
    else 'REVISAO_MANUAL_OUTRO'
  end as decisao_sugerida,
  case
    when gd.quantidade_cobrancas >= 3 then 'Grupo com tres ou mais cobrancas equivalentes; exige revisao manual integral do encadeamento.'
    when gd.qtd_origem_matricula >= 1
     and gd.qtd_origem_fatura_credito_conexao >= 1
     and gd.quantidade_cobrancas = 2 then 'Padrao de sobreposicao entre MATRICULA e FATURA_CREDITO_CONEXAO; priorizar a cobranca vinculada a fatura.'
    when gd.quantidade_cobrancas = 2
     and gd.qtd_origem_fatura_credito_conexao = 2 then 'Duas cobrancas de FATURA_CREDITO_CONEXAO no mesmo grupo; suspeita de reprocessamento ou fechamento duplicado.'
    else 'Grupo fora do padrao dominante; revisar origem, recebimentos e vinculos antes de qualquer acao.'
  end as observacao_tecnica
from grupos_duplicados gd
order by
  case
    when gd.quantidade_cobrancas >= 3 then 'TRIPLA_OU_MAIS'
    when gd.qtd_origem_matricula >= 1
     and gd.qtd_origem_fatura_credito_conexao >= 1
     and gd.quantidade_cobrancas = 2 then 'MATRICULA_X_FATURA'
    when gd.quantidade_cobrancas = 2
     and gd.qtd_origem_fatura_credito_conexao = 2 then 'FATURA_DUPLA'
    else 'OUTRO'
  end,
  gd.pessoa_nome,
  gd.valor_centavos;
