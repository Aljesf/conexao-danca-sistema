-- View para busca unificada (Pessoa -> Cobrancas/Recebimentos) usada na emissao de recibo.
-- Mantem retorno simples e eficiente para autocomplete.

begin;

create or replace view public.vw_documentos_busca_recibo as
with cobr as (
  select
    'COBRANCA'::text as tipo,
    c.id::bigint as ref_id,
    c.pessoa_id::bigint as pessoa_id,
    p.nome::text as pessoa_nome,
    coalesce(p.cpf, '')::text as pessoa_cpf,
    coalesce(p.telefone, '')::text as pessoa_telefone,
    coalesce(c.competencia_ano_mes, '')::text as competencia_ano_mes,
    c.valor_centavos::int as valor_centavos,
    coalesce(c.status, '')::text as status,
    c.created_at as created_at,
    c.id::bigint as cobranca_id
  from public.cobrancas c
  join public.pessoas p on p.id = c.pessoa_id
),
rec as (
  select
    'RECEBIMENTO'::text as tipo,
    r.id::bigint as ref_id,
    c.pessoa_id::bigint as pessoa_id,
    p.nome::text as pessoa_nome,
    coalesce(p.cpf, '')::text as pessoa_cpf,
    coalesce(p.telefone, '')::text as pessoa_telefone,
    coalesce(c.competencia_ano_mes, '')::text as competencia_ano_mes,
    r.valor_centavos::int as valor_centavos,
    coalesce(c.status, '')::text as status,
    r.created_at as created_at,
    r.cobranca_id::bigint as cobranca_id
  from public.recebimentos r
  join public.cobrancas c on c.id = r.cobranca_id
  join public.pessoas p on p.id = c.pessoa_id
)
select * from cobr
union all
select * from rec;

comment on view public.vw_documentos_busca_recibo is
'Busca unificada para emissao de recibo (Pessoa/Cobranca/Recebimento).';

commit;
