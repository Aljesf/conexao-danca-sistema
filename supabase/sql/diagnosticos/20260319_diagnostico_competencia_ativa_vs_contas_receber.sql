-- Diagnostico comparativo entre a tela de competencia ativa e a carteira real de contas a receber.
-- Apenas SELECTs. Nao altera dados.

WITH competencia_ativa AS (
  SELECT
    o.cobranca_id,
    o.cobranca_fonte,
    o.pessoa_id,
    o.pessoa_nome,
    o.competencia_ano_mes,
    o.data_vencimento,
    o.status_cobranca,
    o.status_operacional,
    o.neofin_situacao_operacional,
    o.origem_tipo,
    o.origem_subtipo,
    o.descricao,
    o.valor_centavos,
    o.valor_pago_centavos,
    o.saldo_aberto_centavos,
    o.fatura_id,
    o.fatura_competencia,
    o.fatura_status,
    o.conta_conexao_id,
    o.tipo_conta
  FROM public.vw_financeiro_cobrancas_operacionais o
  WHERE o.tipo_conta = 'ALUNO'
),
carteira_real AS (
  SELECT
    f.cobranca_id,
    f.pessoa_id,
    f.competencia_ano_mes,
    f.vencimento,
    f.status_cobranca AS status_flat,
    f.situacao_saas,
    f.bucket_vencimento,
    f.valor_centavos,
    f.valor_recebido_centavos,
    f.saldo_aberto_centavos,
    c.status AS status_cobranca,
    COALESCE(c.expurgada, false) AS expurgada,
    c.origem_tipo,
    c.origem_subtipo,
    c.descricao,
    c.competencia_ano_mes AS competencia_cobranca,
    fat.id AS fatura_id_direta,
    fat.periodo_referencia AS fatura_competencia_direta,
    fat.status AS fatura_status_direta,
    fat.conta_conexao_id AS conta_conexao_id_direta
  FROM public.vw_financeiro_contas_receber_flat f
  LEFT JOIN public.cobrancas c
    ON c.id = f.cobranca_id
  LEFT JOIN public.credito_conexao_faturas fat
    ON fat.cobranca_id = f.cobranca_id
       OR (
         UPPER(COALESCE(c.origem_tipo, '')) IN ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA')
         AND fat.id = c.origem_id
       )
),
comparativo AS (
  SELECT
    a.cobranca_id,
    a.cobranca_fonte,
    a.pessoa_id,
    a.pessoa_nome,
    a.competencia_ano_mes AS competencia_ativa,
    r.competencia_ano_mes AS competencia_carteira,
    a.data_vencimento,
    a.status_cobranca AS status_competencia_ativa,
    r.status_cobranca AS status_carteira_real,
    r.status_flat,
    a.status_operacional,
    r.situacao_saas,
    a.neofin_situacao_operacional,
    a.origem_tipo AS origem_tipo_competencia,
    COALESCE(r.origem_tipo, a.origem_tipo) AS origem_tipo_canonica,
    a.origem_subtipo AS origem_subtipo_competencia,
    COALESCE(r.origem_subtipo, a.origem_subtipo) AS origem_subtipo_canonica,
    COALESCE(r.descricao, a.descricao) AS descricao_canonica,
    a.valor_centavos,
    a.valor_pago_centavos,
    a.saldo_aberto_centavos,
    COALESCE(r.expurgada, false) AS expurgada,
    a.fatura_id,
    COALESCE(r.fatura_id_direta, a.fatura_id) AS fatura_id_canonica,
    COALESCE(r.fatura_competencia_direta, a.fatura_competencia) AS fatura_competencia_canonica,
    COALESCE(r.fatura_status_direta, a.fatura_status) AS fatura_status_canonica,
    COALESCE(r.conta_conexao_id_direta, a.conta_conexao_id) AS conta_conexao_id_canonica,
    CASE
      WHEN a.cobranca_fonte <> 'COBRANCA' THEN 'fonte_fora_da_carteira_real'
      WHEN r.cobranca_id IS NULL THEN 'sem_registro_na_carteira_real'
      WHEN COALESCE(r.expurgada, false) THEN 'expurgado'
      WHEN UPPER(COALESCE(r.status_cobranca, r.status_flat, '')) = 'CANCELADA' THEN 'cancelado'
      WHEN UPPER(COALESCE(r.situacao_saas, '')) = 'QUITADA' THEN 'baixado_ou_quitado'
      WHEN COALESCE(r.saldo_aberto_centavos, 0) <= 0 THEN 'sem_saldo_operacional'
      WHEN UPPER(COALESCE(r.descricao, '')) LIKE '%REPROCESSAMENTO%'
       AND UPPER(COALESCE(r.status_cobranca, r.status_flat, '')) = 'CANCELADA' THEN 'substituido_por_reprocessamento'
      ELSE 'elegivel'
    END AS motivo_exclusao
  FROM competencia_ativa a
  LEFT JOIN carteira_real r
    ON r.cobranca_id = a.cobranca_id
)

-- 1) Itens exibidos na competencia ativa que nao deveriam compor a carteira operacional.
SELECT
  c.cobranca_id,
  c.cobranca_fonte,
  c.pessoa_id,
  c.pessoa_nome,
  c.competencia_ativa,
  c.data_vencimento,
  c.status_competencia_ativa,
  c.status_operacional,
  c.status_carteira_real,
  c.situacao_saas,
  c.neofin_situacao_operacional,
  c.origem_tipo_competencia,
  c.origem_subtipo_competencia,
  c.fatura_id,
  c.fatura_id_canonica,
  c.motivo_exclusao
FROM comparativo c
WHERE c.motivo_exclusao <> 'elegivel'
ORDER BY c.competencia_ativa DESC, c.pessoa_nome NULLS LAST, c.cobranca_id DESC;

-- 2) Divergencia entre status da competencia ativa, carteira real, fatura e cobranca.
SELECT
  c.cobranca_id,
  c.pessoa_nome,
  c.competencia_ativa,
  c.status_competencia_ativa,
  c.status_operacional,
  c.status_carteira_real,
  c.status_flat,
  c.situacao_saas,
  c.fatura_id_canonica,
  c.fatura_competencia_canonica,
  c.fatura_status_canonica,
  c.neofin_situacao_operacional,
  c.motivo_exclusao
FROM comparativo c
WHERE (
    c.status_operacional = 'PAGO'
    AND COALESCE(c.situacao_saas, '') <> 'QUITADA'
  )
  OR (
    c.status_operacional = 'PENDENTE_VENCIDO'
    AND COALESCE(c.situacao_saas, '') NOT IN ('VENCIDA', 'EM_ABERTO')
  )
  OR (
    c.status_operacional = 'PENDENTE_A_VENCER'
    AND COALESCE(c.situacao_saas, '') NOT IN ('EM_ABERTO', 'VENCIDA')
  )
  OR (
    c.fatura_id IS DISTINCT FROM c.fatura_id_canonica
  )
ORDER BY c.competencia_ativa DESC, c.cobranca_id DESC;

-- 3) Registros ainda marcados com modelagem ou linguagem antiga de matricula
-- quando a leitura principal ja deveria estar centrada em conta interna / fatura.
SELECT
  c.cobranca_id,
  c.pessoa_nome,
  c.competencia_ativa,
  c.origem_tipo_canonica,
  c.origem_subtipo_canonica,
  c.descricao_canonica,
  c.conta_conexao_id_canonica,
  c.fatura_id_canonica,
  c.fatura_competencia_canonica,
  c.motivo_exclusao
FROM comparativo c
WHERE UPPER(COALESCE(c.origem_tipo_canonica, '')) LIKE 'MATRICULA%'
   OR UPPER(COALESCE(c.origem_subtipo_canonica, '')) LIKE '%MATRICULA%'
   OR UPPER(COALESCE(c.descricao_canonica, '')) LIKE '%REPROCESSAMENTO MATRICULA%'
ORDER BY c.competencia_ativa DESC, c.cobranca_id DESC;

-- 4) Foco especifico em itens da view operacional que nunca aparecem na carteira real.
SELECT
  a.cobranca_id,
  a.cobranca_fonte,
  a.pessoa_nome,
  a.competencia_ano_mes,
  a.status_cobranca,
  a.status_operacional,
  a.origem_tipo,
  a.origem_subtipo,
  a.fatura_id,
  a.fatura_competencia,
  a.descricao
FROM public.vw_financeiro_cobrancas_operacionais a
LEFT JOIN public.vw_financeiro_contas_receber_flat f
  ON f.cobranca_id = a.cobranca_id
WHERE a.tipo_conta = 'ALUNO'
  AND f.cobranca_id IS NULL
ORDER BY a.competencia_ano_mes DESC, a.cobranca_id DESC;
