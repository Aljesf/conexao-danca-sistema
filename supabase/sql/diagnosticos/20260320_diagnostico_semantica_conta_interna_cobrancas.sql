-- Diagnóstico de semântica da cobrança:
-- objetivo: provar qual cobrança oficial pertence a qual conta interna / fatura interna
-- e quais itens compõem essa cobrança.
-- Observação: este diagnóstico usa o schema real atual do projeto.
-- Não executar UPDATE/DELETE. Apenas SELECTs diagnósticos.

WITH cobrancas_base AS (
  SELECT
    c.id AS cobranca_id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.centro_custo_id,
    c.status,
    c.valor_centavos,
    COALESCE(SUM(r.valor_centavos), 0) AS valor_pago_centavos,
    c.vencimento AS data_vencimento
  FROM public.cobrancas c
  LEFT JOIN public.recebimentos r
    ON r.cobranca_id = c.id
  WHERE c.competencia_ano_mes IS NOT NULL
    AND COALESCE(c.status, '') NOT IN ('CANCELADA', 'EXPURGADA', 'SUBSTITUIDA')
  GROUP BY
    c.id,
    c.pessoa_id,
    c.competencia_ano_mes,
    c.centro_custo_id,
    c.status,
    c.valor_centavos,
    c.vencimento
),
lancamentos_base AS (
  SELECT
    l.id AS lancamento_id,
    l.cobranca_id,
    l.conta_conexao_id,
    l.aluno_id,
    l.matricula_id,
    l.referencia_item,
    l.descricao,
    l.valor_centavos,
    l.origem_sistema,
    l.composicao_json
  FROM public.credito_conexao_lancamentos l
),
fatura_lancamentos_base AS (
  SELECT
    fl.lancamento_id,
    fl.fatura_id
  FROM public.credito_conexao_fatura_lancamentos fl
),
faturas_base AS (
  SELECT
    f.id AS fatura_id,
    f.conta_conexao_id,
    f.cobranca_id AS cobranca_fatura_id,
    f.neofin_invoice_id,
    f.periodo_referencia AS competencia_ano_mes,
    f.status AS status_fatura
  FROM public.credito_conexao_faturas f
),
contas_base AS (
  SELECT
    cc.id AS conta_interna_id,
    cc.descricao_exibicao AS conta_interna_descricao,
    cc.pessoa_titular_id,
    cc.responsavel_financeiro_pessoa_id
  FROM public.credito_conexao_contas cc
)
SELECT
  cb.cobranca_id,
  cb.competencia_ano_mes,
  cb.pessoa_id,
  p_resp.nome AS pessoa_nome,
  cb.valor_centavos,
  cb.valor_pago_centavos,
  cb.data_vencimento,
  lb.lancamento_id,
  lb.conta_conexao_id,
  conta.conta_interna_descricao,
  conta.pessoa_titular_id,
  titular.nome AS pessoa_titular_nome,
  conta.responsavel_financeiro_pessoa_id,
  responsavel.nome AS responsavel_financeiro_nome,
  lb.aluno_id,
  aluno.nome AS aluno_nome,
  lb.matricula_id,
  lb.origem_sistema,
  lb.referencia_item,
  lb.descricao,
  lb.valor_centavos AS lancamento_valor_centavos,
  flb.fatura_id,
  fb.cobranca_fatura_id,
  fb.neofin_invoice_id,
  fb.status_fatura,
  fb.competencia_ano_mes AS fatura_competencia_ano_mes,
  lb.composicao_json
FROM cobrancas_base cb
LEFT JOIN public.pessoas p_resp
  ON p_resp.id = cb.pessoa_id
LEFT JOIN lancamentos_base lb
  ON lb.cobranca_id = cb.cobranca_id
LEFT JOIN contas_base conta
  ON conta.conta_interna_id = lb.conta_conexao_id
LEFT JOIN public.pessoas titular
  ON titular.id = conta.pessoa_titular_id
LEFT JOIN public.pessoas responsavel
  ON responsavel.id = conta.responsavel_financeiro_pessoa_id
LEFT JOIN public.pessoas aluno
  ON aluno.id = lb.aluno_id
LEFT JOIN fatura_lancamentos_base flb
  ON flb.lancamento_id = lb.lancamento_id
LEFT JOIN faturas_base fb
  ON fb.fatura_id = flb.fatura_id
WHERE cb.competencia_ano_mes = '2026-03'
ORDER BY cb.cobranca_id, lb.lancamento_id, flb.fatura_id;
