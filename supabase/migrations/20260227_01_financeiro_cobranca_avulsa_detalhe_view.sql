begin;

-- View de detalhe SaaS-friendly:
-- - pagador (responsavel financeiro) com nome
-- - quando origem for matricula, tenta resolver aluno pelo registro da matricula

create or replace view public.vw_financeiro_cobranca_avulsa_detalhe as
select
  ca.id,
  ca.pessoa_id as pagador_pessoa_id,
  pp.nome as pagador_nome,
  pp.cpf as pagador_cpf,
  pp.telefone as pagador_telefone,

  ca.origem_tipo,
  ca.origem_id,

  -- Enriquecimento por matricula (quando fizer sentido)
  m.id as matricula_id,
  m.pessoa_id as aluno_pessoa_id,
  pa.nome as aluno_nome,

  ca.valor_centavos,
  ca.vencimento,
  ca.status,
  ca.meio,
  ca.motivo_excecao,
  ca.observacao,
  ca.criado_em,
  ca.pago_em
from public.financeiro_cobrancas_avulsas ca
join public.pessoas pp on pp.id = ca.pessoa_id
left join public.matriculas m
  on ca.origem_id = m.id
  and (
    ca.origem_tipo = 'MATRICULA'
    or ca.origem_tipo = 'MATRICULA_ENTRADA'
    or ca.origem_tipo ilike 'MATRICULA%'
  )
left join public.pessoas pa on pa.id = m.pessoa_id;

comment on view public.vw_financeiro_cobranca_avulsa_detalhe is
'Detalhe enriquecido de cobranca avulsa (pagador + aluno quando origem for matricula).';

commit;
