-- Atualizacao de nomenclatura: "Cartao Conexao / Fatura Cartao" -> "Conta interna"
-- Data: 2026-04-04
-- Escopo:
-- - cobrancas canonicas de fatura da conta interna
-- - nao houve linhas para atualizar em credito_conexao_lancamentos
-- - credito_conexao_faturas nao possui campo descritivo para saneamento textual

-- Diagnostico rapido
SELECT COUNT(*) AS total_canonico_com_nomenclatura_antiga
FROM public.cobrancas
WHERE origem_tipo IN ('CREDITO_CONEXAO_FATURA', 'FATURA_CREDITO_CONEXAO')
  AND (
    descricao ILIKE 'Mensalidade Conexao Danca%'
    OR descricao ILIKE 'Mensalidade Conexão Dança%'
    OR descricao ILIKE 'Fatura Cartao Conexao%'
    OR descricao ILIKE 'Fatura Cartão Conexão%'
    OR descricao ILIKE '%cartao conexao%'
    OR descricao ILIKE '%cartão conexão%'
  );

BEGIN;

-- Padrao real encontrado no banco:
-- "Mensalidade Conexao Danca - {periodo} - Fatura #{id}"
-- incluindo variacoes com extras " (+ ...)" ao final.
UPDATE public.cobrancas
SET descricao = REGEXP_REPLACE(
      descricao,
      '^(Mensalidade Conexao Danca|Mensalidade Conexão Dança)',
      'Conta interna',
      'i'
    ),
    updated_at = now()
WHERE origem_tipo IN ('CREDITO_CONEXAO_FATURA', 'FATURA_CREDITO_CONEXAO')
  AND (
    descricao ILIKE 'Mensalidade Conexao Danca%'
    OR descricao ILIKE 'Mensalidade Conexão Dança%'
  );

-- Bloco mantido para futuras variacoes; em 2026-04-04 retornou zero linhas.
UPDATE public.cobrancas
SET descricao = REGEXP_REPLACE(
      descricao,
      'Fatura Carta[oã]o Conexa[oã]o',
      'Fatura conta interna',
      'ig'
    ),
    updated_at = now()
WHERE origem_tipo IN ('CREDITO_CONEXAO_FATURA', 'FATURA_CREDITO_CONEXAO')
  AND (
    descricao ILIKE 'Fatura Cartao Conexao%'
    OR descricao ILIKE 'Fatura Cartão Conexão%'
  );

COMMIT;

-- Verificacao final
SELECT COUNT(*) AS restantes_com_nomenclatura_antiga
FROM public.cobrancas
WHERE (
    descricao ILIKE '%cartao conexao%'
    OR descricao ILIKE '%cartão conexão%'
    OR descricao ILIKE '%mensalidade conexao danca%'
    OR descricao ILIKE '%mensalidade conexão dança%'
    OR descricao ILIKE '%fatura cartao%'
    OR descricao ILIKE '%fatura cartão%'
  )
  AND origem_tipo IN ('CREDITO_CONEXAO_FATURA', 'FATURA_CREDITO_CONEXAO')
  AND status NOT IN ('CANCELADA', 'CANCELADO');

SELECT id, descricao, status, competencia_ano_mes
FROM public.cobrancas
WHERE origem_tipo IN ('CREDITO_CONEXAO_FATURA', 'FATURA_CREDITO_CONEXAO')
  AND status NOT IN ('CANCELADA', 'CANCELADO')
ORDER BY id DESC
LIMIT 20;
