begin;

create or replace view public.vw_credito_conexao_fatura_itens_enriquecida as
with base as (
  select
    fi.*,
    case
      when coalesce(fi.composicao_json ->> 'aluno_pessoa_id', '') ~ '^[0-9]+$'
        then (fi.composicao_json ->> 'aluno_pessoa_id')::bigint
      when coalesce(fi.composicao_json ->> 'pessoa_id', '') ~ '^[0-9]+$'
        then (fi.composicao_json ->> 'pessoa_id')::bigint
      else null::bigint
    end as aluno_pessoa_id_top,
    coalesce(
      nullif(fi.composicao_json ->> 'aluno_nome', ''),
      nullif(fi.composicao_json ->> 'nome_aluno', '')
    ) as aluno_nome_top
  from public.vw_credito_conexao_fatura_itens fi
),
base_with_item as (
  select
    b.*,
    item.elem as item_json
  from base b
  left join lateral (
    select elem
    from jsonb_array_elements(
      case
        when jsonb_typeof(b.composicao_json -> 'itens') = 'array'
          then b.composicao_json -> 'itens'
        when jsonb_typeof(b.composicao_json -> 'items') = 'array'
          then b.composicao_json -> 'items'
        else '[]'::jsonb
      end
    ) elem
    limit 1
  ) item on true
),
resolved as (
  select
    bi.*,
    coalesce(
      bi.aluno_pessoa_id_top,
      case
        when coalesce(bi.item_json ->> 'aluno_pessoa_id', '') ~ '^[0-9]+$'
          then (bi.item_json ->> 'aluno_pessoa_id')::bigint
        when coalesce(bi.item_json ->> 'pessoa_id', '') ~ '^[0-9]+$'
          then (bi.item_json ->> 'pessoa_id')::bigint
        when coalesce(bi.item_json ->> 'dependente_pessoa_id', '') ~ '^[0-9]+$'
          then (bi.item_json ->> 'dependente_pessoa_id')::bigint
        else null::bigint
      end
    ) as aluno_pessoa_id,
    coalesce(
      nullif(bi.item_json ->> 'aluno_nome', ''),
      nullif(bi.item_json ->> 'nome_aluno', ''),
      bi.aluno_nome_top
    ) as aluno_nome_texto
  from base_with_item bi
)
select
  r.fatura_id,
  r.conta_conexao_id,
  r.competencia_ano_mes,
  r.data_fechamento,
  r.data_vencimento,
  r.valor_total_centavos,
  r.status_fatura,
  r.cobranca_fatura_id,
  r.pessoa_titular_id,
  r.titular_nome,
  r.titular_cpf,
  r.titular_telefone,
  r.lancamento_id,
  r.origem_sistema,
  r.origem_id,
  r.descricao,
  r.valor_centavos,
  r.data_lancamento,
  r.status_lancamento,
  r.composicao_json,
  r.aluno_pessoa_id,
  coalesce(pa.nome, nullif(r.aluno_nome_texto, '')) as aluno_nome,
  r.pessoa_titular_id as responsavel_financeiro_id,
  coalesce(pr.nome, r.titular_nome) as responsavel_financeiro_nome
from resolved r
left join public.pessoas pa on pa.id = r.aluno_pessoa_id
left join public.pessoas pr on pr.id = r.pessoa_titular_id;

comment on view public.vw_credito_conexao_fatura_itens_enriquecida is
'Itens de fatura do Cartao Conexao enriquecidos com aluno_nome e responsavel_financeiro_nome.';

commit;
