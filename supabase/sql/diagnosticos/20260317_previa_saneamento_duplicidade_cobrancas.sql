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
      when coalesce(fpc.qtd_faturas, 0) > 0 then true
      else false
    end as possui_fatura
  from public.cobrancas c
  left join public.pessoas p
    on p.id = c.pessoa_id
  left join faturas_por_cobranca fpc
    on fpc.cobranca_id = c.id
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_classificados as (
  select
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos,
    count(*) as quantidade_cobrancas,
    count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'MATRICULA') as qtd_origem_matricula,
    count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') as qtd_origem_fatura_credito_conexao,
    sum(case when b.possui_fatura then 1 else 0 end) as qtd_com_fatura,
    count(*) - sum(case when b.possui_fatura then 1 else 0 end) as qtd_sem_fatura,
    case
      when count(*) >= 3 then 'TRIPLA_OU_MAIS'
      when count(*) = 2
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'MATRICULA') >= 1
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') >= 1 then 'MATRICULA_X_FATURA'
      when count(*) = 2
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') = 2 then 'FATURA_DUPLA'
      else 'OUTRO'
    end as classificacao_grupo,
    case
      when count(*) >= 3 then 'REVISAO_MANUAL_TRIPLA'
      when count(*) = 2
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'MATRICULA') >= 1
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') >= 1 then 'MANTER_FATURA_E_REVISAR_MATRICULA'
      when count(*) = 2
       and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') = 2 then 'REVISAO_MANUAL_DUPLA_FATURA'
      else 'REVISAO_MANUAL_OUTRO'
    end as decisao_sugerida
  from base b
  group by
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos
  having count(*) > 1
)
select
  b.cobranca_id,
  b.pessoa_nome,
  b.competencia_ano_mes,
  b.valor_centavos,
  b.origem_tipo,
  b.origem_id,
  b.possui_fatura,
  gc.classificacao_grupo,
  gc.decisao_sugerida,
  case
    when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and b.possui_fatura then 'MANTER'
    when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and upper(coalesce(b.origem_tipo, '')) = 'MATRICULA' and not b.possui_fatura then 'REVISAR_CANCELAMENTO'
    else 'REVISAO_MANUAL'
  end as acao_sugerida_individual,
  case
    when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and b.possui_fatura then 'Cobranca do grupo misto ja vinculada a fatura; tende a ser o registro canonico a preservar.'
    when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and upper(coalesce(b.origem_tipo, '')) = 'MATRICULA' and not b.possui_fatura then 'Cobranca de MATRICULA sem vinculo a fatura em grupo misto; candidata a revisao para cancelamento controlado.'
    when gc.classificacao_grupo = 'FATURA_DUPLA' then 'Grupo com duas cobrancas FATURA_CREDITO_CONEXAO; exige validacao manual antes de qualquer saneamento.'
    when gc.classificacao_grupo = 'TRIPLA_OU_MAIS' then 'Grupo com tres ou mais cobrancas equivalentes; revisar integralmente origem, recebimentos e vinculos.'
    else 'Grupo fora do padrao principal; revisar manualmente antes de definir acao.'
  end as motivo_acao
from base b
join grupos_classificados gc
  on gc.pessoa_id = b.pessoa_id
 and gc.competencia_ano_mes is not distinct from b.competencia_ano_mes
 and gc.valor_centavos = b.valor_centavos
order by
  gc.classificacao_grupo,
  b.pessoa_nome,
  b.valor_centavos,
  b.possui_fatura desc,
  b.cobranca_id;
