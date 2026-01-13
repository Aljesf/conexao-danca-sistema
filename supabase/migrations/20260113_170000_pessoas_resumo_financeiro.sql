-- VIEW resiliente a variacao de nomes de colunas via to_jsonb()->>'campo'

create or replace view public.vw_pessoa_resumo_financeiro as
with
resp as (
  select
    p.id as pessoa_id,
    coalesce(
      (
        select m.responsavel_financeiro_id
        from public.matriculas m
        where m.pessoa_id = p.id
        order by m.created_at desc nulls last
        limit 1
      ),
      p.id
    ) as responsavel_financeiro_id
  from public.pessoas p
),

/*
  Cobrancas diretas:
  - Nao referenciar colunas diretamente (pode nao existir).
  - Usar to_jsonb(c)->>'coluna' para tolerar variacoes:
    vencimento vs data_vencimento
    valor_centavos vs valor_total_centavos
*/
cobr as (
  select
    (to_jsonb(c)->>'id')::bigint as cobranca_id,
    (to_jsonb(c)->>'pessoa_id')::bigint as devedor_pessoa_id,
    nullif(
      coalesce(
        to_jsonb(c)->>'data_vencimento',
        to_jsonb(c)->>'vencimento'
      ),
      ''
    )::date as data_vencimento,
    coalesce(
      nullif(to_jsonb(c)->>'valor_total_centavos','')::bigint,
      nullif(to_jsonb(c)->>'valor_centavos','')::bigint,
      0
    )::bigint as valor_centavos,
    coalesce(nullif(to_jsonb(c)->>'status',''), 'DESCONHECIDO')::text as status,
    coalesce(nullif(to_jsonb(c)->>'origem_tipo',''), '')::text as origem_tipo,
    coalesce(nullif(to_jsonb(c)->>'origem_subtipo',''), '')::text as origem_subtipo,
    (to_jsonb(c)->>'created_at')::timestamptz as created_at
  from public.cobrancas c
),

cobr_pendentes as (
  select
    r.pessoa_id,
    b.cobranca_id,
    b.devedor_pessoa_id,
    b.data_vencimento,
    b.valor_centavos,
    b.status,
    b.origem_tipo,
    b.origem_subtipo,
    (b.data_vencimento is not null and b.data_vencimento < current_date) as vencida,
    b.created_at
  from resp r
  join cobr b
    on b.devedor_pessoa_id = r.responsavel_financeiro_id
  where upper(b.status) in ('ABERTA', 'PENDENTE', 'EM_ABERTO', 'OPEN')
),

/*
  Cartao Conexao:
  - Mesma abordagem resiliente.
*/
contas as (
  select
    (to_jsonb(cc)->>'id')::bigint as conta_conexao_id,
    (to_jsonb(cc)->>'pessoa_titular_id')::bigint as pessoa_titular_id
  from public.credito_conexao_contas cc
),

faturas as (
  select
    (to_jsonb(f)->>'id')::bigint as fatura_id,
    (to_jsonb(f)->>'conta_conexao_id')::bigint as conta_conexao_id,
    coalesce(nullif(to_jsonb(f)->>'periodo_referencia',''), '')::text as periodo_referencia,
    nullif(to_jsonb(f)->>'data_vencimento','')::date as data_vencimento,
    coalesce(nullif(to_jsonb(f)->>'valor_total_centavos','')::bigint, 0)::bigint as valor_total_centavos,
    coalesce(nullif(to_jsonb(f)->>'status',''), 'DESCONHECIDO')::text as status,
    (to_jsonb(f)->>'created_at')::timestamptz as created_at
  from public.credito_conexao_faturas f
),

faturas_pendentes as (
  select
    r.pessoa_id,
    r.responsavel_financeiro_id,
    ct.conta_conexao_id,
    ft.fatura_id,
    ft.periodo_referencia,
    ft.data_vencimento,
    ft.valor_total_centavos,
    ft.status,
    (
      ft.data_vencimento is not null
      and ft.data_vencimento < current_date
      and upper(ft.status) in ('ABERTA','EM_ATRASO','PENDENTE','OPEN')
    ) as vencida,
    ft.created_at
  from resp r
  join contas ct
    on ct.pessoa_titular_id = r.responsavel_financeiro_id
  join faturas ft
    on ft.conta_conexao_id = ct.conta_conexao_id
  where upper(ft.status) in ('ABERTA', 'EM_ATRASO', 'PENDENTE', 'OPEN')
)

select
  r.pessoa_id,
  r.responsavel_financeiro_id,

  -- agregados de cobrancas diretas
  (select coalesce(count(*),0) from cobr_pendentes cp where cp.pessoa_id = r.pessoa_id) as cobrancas_pendentes_qtd,
  (select coalesce(sum(cp.valor_centavos),0) from cobr_pendentes cp where cp.pessoa_id = r.pessoa_id) as cobrancas_pendentes_total_centavos,
  (select coalesce(count(*),0) from cobr_pendentes cp where cp.pessoa_id = r.pessoa_id and cp.vencida = true) as cobrancas_vencidas_qtd,

  -- agregados de faturas
  (select coalesce(count(*),0) from faturas_pendentes fp where fp.pessoa_id = r.pessoa_id) as faturas_pendentes_qtd,
  (select coalesce(sum(fp.valor_total_centavos),0) from faturas_pendentes fp where fp.pessoa_id = r.pessoa_id) as faturas_pendentes_total_centavos,
  (select coalesce(count(*),0) from faturas_pendentes fp where fp.pessoa_id = r.pessoa_id and fp.vencida = true) as faturas_vencidas_qtd
from resp r;
