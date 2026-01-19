-- Rode ESTE BLOCO no SQL Editor do Supabase (de preferencia sem "auto-transaction" extra).
-- Objetivo: (a) diagnosticar, (b) criar C5 com COMMIT, (c) preparar copia das variantes.

-- ------------------------------------------------------
-- A) DIAGNOSTICO RAPIDO (confirma que C8 existe e C5 nao)
-- ------------------------------------------------------
SELECT codigo, id, nome
FROM public.loja_produtos
WHERE codigo IN ('UNIF-INF-C8','UNIF-ADU-C8','UNIF-INF-C5','UNIF-ADU-C5')
ORDER BY codigo;

-- Confirma se o SELECT-fonte retorna linha (se retornar 0, o INSERT nunca iria criar nada)
SELECT 'INF-FONTE' AS origem, count(*) AS qt
FROM public.loja_produtos
WHERE codigo = 'UNIF-INF-C8';

SELECT 'ADU-FONTE' AS origem, count(*) AS qt
FROM public.loja_produtos
WHERE codigo = 'UNIF-ADU-C8';

-- ------------------------------------------------------
-- B) CRIACAO DOS PRODUTOS C5 (COM COMMIT)
-- ------------------------------------------------------
BEGIN;

-- Infantil C5 (copia campos do Infantil C8)
INSERT INTO public.loja_produtos (
  codigo,
  nome,
  descricao,
  categoria,
  preco_venda_centavos,
  unidade,
  estoque_atual,
  ativo,
  observacoes,
  bloqueado_para_venda,
  categoria_subcategoria_id,
  fornecedor_principal_id,
  marca_id,
  modelo_id
)
SELECT
  'UNIF-INF-C5',
  'Uniforme Conexão Dança Infantil - C5',
  p.descricao,
  p.categoria,
  p.preco_venda_centavos,
  p.unidade,
  0,
  p.ativo,
  'Criado via SQL (base) a partir do C8 Infantil',
  p.bloqueado_para_venda,
  p.categoria_subcategoria_id,
  p.fornecedor_principal_id,
  p.marca_id,
  p.modelo_id
FROM public.loja_produtos p
WHERE p.codigo = 'UNIF-INF-C8'
  AND NOT EXISTS (SELECT 1 FROM public.loja_produtos x WHERE x.codigo = 'UNIF-INF-C5');

-- Adulto C5 (copia campos do Adulto C8)
INSERT INTO public.loja_produtos (
  codigo,
  nome,
  descricao,
  categoria,
  preco_venda_centavos,
  unidade,
  estoque_atual,
  ativo,
  observacoes,
  bloqueado_para_venda,
  categoria_subcategoria_id,
  fornecedor_principal_id,
  marca_id,
  modelo_id
)
SELECT
  'UNIF-ADU-C5',
  'Uniforme Conexão Dança Adulto - C5',
  p.descricao,
  p.categoria,
  p.preco_venda_centavos,
  p.unidade,
  0,
  p.ativo,
  'Criado via SQL (base) a partir do C8 Adulto',
  p.bloqueado_para_venda,
  p.categoria_subcategoria_id,
  p.fornecedor_principal_id,
  p.marca_id,
  p.modelo_id
FROM public.loja_produtos p
WHERE p.codigo = 'UNIF-ADU-C8'
  AND NOT EXISTS (SELECT 1 FROM public.loja_produtos x WHERE x.codigo = 'UNIF-ADU-C5');

COMMIT;

-- Verifica se agora existe
SELECT codigo, id, nome, created_at
FROM public.loja_produtos
WHERE codigo IN ('UNIF-INF-C5','UNIF-ADU-C5')
ORDER BY codigo;

-- =========================================================
-- 2) VARIANTES — IDENTIFICAR A TABELA CERTA E COPIAR DO C8
-- =========================================================
-- IMPORTANTE:
-- Seu script original NAO cria variantes.
-- Primeiro precisamos descobrir QUAL tabela guarda as variantes no seu schema.

-- ------------------------------------------------------
-- C) DESCOBRIR tabelas que referenciam loja_produtos.id
-- (normalmente a tabela de variantes tem uma FK produto_id)
-- ------------------------------------------------------
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'loja_produtos'
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;

-- ------------------------------------------------------
-- D) ASSIM QUE VOCE IDENTIFICAR a tabela de variantes,
-- rode um "preview" para confirmar como ela se comporta.
-- Exemplo (troque public.SUA_TABELA_VARIANTES):
-- ------------------------------------------------------
-- SELECT *
-- FROM public.SUA_TABELA_VARIANTES
-- WHERE produto_id = (SELECT id FROM public.loja_produtos WHERE codigo='UNIF-INF-C8')
-- LIMIT 50;

-- ------------------------------------------------------
-- E) MODELO DE COPIA (template seguro)
-- Depois de descobrir o nome da tabela de variantes e as colunas,
-- vamos copiar "tudo menos o id" e trocar apenas produto_id.
--
-- Como cada projeto pode ter colunas diferentes, o proximo passo e:
-- 1) voce cola aqui o DDL (ou um print) da tabela de variantes,
-- 2) eu te devolvo o INSERT exato (colunas corretas, sem chute).
-- ------------------------------------------------------
