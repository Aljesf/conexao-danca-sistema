-- ============================================
-- Seeds de formas de pagamento base - Cartao Conexao
-- Tabela alvo: public.formas_pagamento
-- Campos: id (auto), codigo, nome, tipo_base, ativo, created_at, updated_at
-- ============================================

-- Inserir forma de pagamento base: Cartao Conexao Aluno
INSERT INTO public.formas_pagamento (codigo, nome, tipo_base, ativo)
VALUES ('CARTAO_CONEXAO_ALUNO', 'Cartao Conexao Aluno', 'CARTAO_CONEXAO', true)
ON CONFLICT (codigo) DO NOTHING;

-- Inserir forma de pagamento base: Cartao Conexao Colaborador
INSERT INTO public.formas_pagamento (codigo, nome, tipo_base, ativo)
VALUES ('CARTAO_CONEXAO_COLAB', 'Cartao Conexao Colaborador', 'CARTAO_CONEXAO', true)
ON CONFLICT (codigo) DO NOTHING;
