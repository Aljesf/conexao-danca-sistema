BEGIN;

-- Ajuste estes valores conforme seu banco
-- Turma existente:
-- TURMA_ID = 6
-- Ano referencia:
-- ANO_REF = 2026
-- Valor mensalidade (centavos):
-- VALOR = 25000

-- 1) Criar tabela de matricula ativa para a turma/ano
INSERT INTO public.matricula_tabelas (
  produto_tipo,
  referencia_tipo,
  referencia_id,
  ano_referencia,
  titulo,
  ativo
)
SELECT
  'REGULAR',
  'TURMA',
  6,
  2026,
  'Tabela Matricula (Seed) - Turma 6 / 2026',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.matricula_tabelas
  WHERE ativo = true
    AND produto_tipo = 'REGULAR'
    AND referencia_tipo = 'TURMA'
    AND referencia_id = 6
    AND ano_referencia = 2026
);

-- 2) Inserir item MENSALIDADE para essa tabela
INSERT INTO public.matricula_tabela_itens (
  tabela_id,
  codigo_item,
  descricao,
  tipo_item,
  valor_centavos,
  ativo,
  ordem
)
SELECT
  t.id,
  'MENSALIDADE',
  'Mensalidade (Seed) - Turma 6 / 2026',
  'RECORRENTE',
  25000,
  true,
  1
FROM public.matricula_tabelas t
WHERE t.ativo = true
  AND t.produto_tipo = 'REGULAR'
  AND t.referencia_tipo = 'TURMA'
  AND t.referencia_id = 6
  AND t.ano_referencia = 2026
  AND NOT EXISTS (
    SELECT 1
    FROM public.matricula_tabela_itens i
    WHERE i.tabela_id = t.id
      AND i.codigo_item = 'MENSALIDADE'
      AND i.tipo_item = 'RECORRENTE'
      AND i.ativo = true
  );

COMMIT;
