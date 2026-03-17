-- SECAO 1 - BASE DE TRABALHO
with faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
),
base_trabalho as (
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
  from base_trabalho b
  group by
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos
  having count(*) > 1
),
base_decisoria as (
  select
    b.cobranca_id,
    b.pessoa_id,
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
      when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and b.possui_fatura then 'Cobranca vinculada a fatura; tende a ser o registro canonico.'
      when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and upper(coalesce(b.origem_tipo, '')) = 'MATRICULA' and not b.possui_fatura then 'Cobranca MATRICULA sem vinculo a fatura em grupo misto.'
      when gc.classificacao_grupo = 'FATURA_DUPLA' then 'Grupo com duas cobrancas FATURA_CREDITO_CONEXAO; revisao manual obrigatoria.'
      when gc.classificacao_grupo = 'TRIPLA_OU_MAIS' then 'Grupo com tres ou mais cobrancas equivalentes; revisao manual obrigatoria.'
      else 'Grupo fora do padrao dominante; revisao manual obrigatoria.'
    end as motivo_acao
  from base_trabalho b
  join grupos_classificados gc
    on gc.pessoa_id = b.pessoa_id
   and gc.competencia_ano_mes is not distinct from b.competencia_ano_mes
   and gc.valor_centavos = b.valor_centavos
)
select
  cobranca_id,
  pessoa_id,
  pessoa_nome,
  competencia_ano_mes,
  valor_centavos,
  origem_tipo,
  origem_id,
  possui_fatura,
  classificacao_grupo,
  decisao_sugerida,
  acao_sugerida_individual
from base_decisoria
order by
  classificacao_grupo,
  pessoa_nome,
  valor_centavos,
  possui_fatura desc,
  cobranca_id;

-- SECAO 2 - PREVIA DOS CANCELAMENTOS REVISAVEIS
with faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
),
base_trabalho as (
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
  from base_trabalho b
  group by
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos
  having count(*) > 1
),
base_decisoria as (
  select
    b.cobranca_id,
    b.pessoa_id,
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
      when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and b.possui_fatura then 'Cobranca vinculada a fatura; tende a ser o registro canonico.'
      when gc.classificacao_grupo = 'MATRICULA_X_FATURA' and upper(coalesce(b.origem_tipo, '')) = 'MATRICULA' and not b.possui_fatura then 'Cobranca de MATRICULA sem vinculo a fatura em grupo misto; candidata a revisao para cancelamento controlado.'
      when gc.classificacao_grupo = 'FATURA_DUPLA' then 'Grupo com duas cobrancas FATURA_CREDITO_CONEXAO; revisao manual obrigatoria.'
      when gc.classificacao_grupo = 'TRIPLA_OU_MAIS' then 'Grupo com tres ou mais cobrancas equivalentes; revisao manual obrigatoria.'
      else 'Grupo fora do padrao dominante; revisao manual obrigatoria.'
    end as motivo_acao
  from base_trabalho b
  join grupos_classificados gc
    on gc.pessoa_id = b.pessoa_id
   and gc.competencia_ano_mes is not distinct from b.competencia_ano_mes
   and gc.valor_centavos = b.valor_centavos
)
select
  cobranca_id,
  pessoa_nome,
  valor_centavos,
  origem_tipo,
  origem_id,
  motivo_acao
from base_decisoria
where classificacao_grupo = 'MATRICULA_X_FATURA'
  and acao_sugerida_individual = 'REVISAR_CANCELAMENTO'
order by
  pessoa_nome,
  cobranca_id;

-- SECAO 3 - BLOCO SQL DE CANCELAMENTO CONTROLADO (COMENTADO)
-- Pessoa: Bruna do Socorro de Amorin de Lima | cobranca_id: 285 | origem: MATRICULA/2 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 285 AND status != 'CANCELADA';

-- Pessoa: Camila Emanuelle Tavares do Vale | cobranca_id: 216 | origem: MATRICULA/34 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 216 AND status != 'CANCELADA';

-- Pessoa: Gabrielle Ferreira Figueiredo | cobranca_id: 272 | origem: MATRICULA/30 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 272 AND status != 'CANCELADA';

-- Pessoa: Lucianny Van Assche | cobranca_id: 258 | origem: MATRICULA/29 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 258 AND status != 'CANCELADA';

-- Pessoa: Raimundo Nonato Barbosa Pessoa | cobranca_id: 313 | origem: MATRICULA/37 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 313 AND status != 'CANCELADA';

-- Pessoa: Vanessa Aguierre de Amorin | cobranca_id: 412 | origem: MATRICULA/38 | motivo: cobranca de MATRICULA sem vinculo a fatura em grupo misto
-- UPDATE public.cobrancas
-- SET status = 'CANCELADA'
-- WHERE id = 412 AND status != 'CANCELADA';

-- SECAO 4 - POS-VALIDACAO
with faturas_por_cobranca as (
  select
    f.cobranca_id,
    count(*) as qtd_faturas
  from public.credito_conexao_faturas f
  where f.cobranca_id is not null
  group by f.cobranca_id
),
base_trabalho as (
  select
    c.id as cobranca_id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.valor_centavos,
    c.origem_tipo,
    case
      when coalesce(fpc.qtd_faturas, 0) > 0 then true
      else false
    end as possui_fatura
  from public.cobrancas c
  left join faturas_por_cobranca fpc
    on fpc.cobranca_id = c.id
  where upper(coalesce(c.status, '')) <> 'CANCELADA'
),
grupos_matricula_x_fatura as (
  select
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos
  from base_trabalho b
  group by
    b.pessoa_id,
    b.competencia_ano_mes,
    b.valor_centavos
  having count(*) = 2
     and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'MATRICULA') >= 1
     and count(*) filter (where upper(coalesce(b.origem_tipo, '')) = 'FATURA_CREDITO_CONEXAO') >= 1
)
select
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos,
  count(*) as quantidade
from base_trabalho b
join grupos_matricula_x_fatura g
  on g.pessoa_id = b.pessoa_id
 and g.competencia_ano_mes is not distinct from b.competencia_ano_mes
 and g.valor_centavos = b.valor_centavos
group by
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos
having count(*) > 1
order by
  b.pessoa_id,
  b.competencia_ano_mes,
  b.valor_centavos;
