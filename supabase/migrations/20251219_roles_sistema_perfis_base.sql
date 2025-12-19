-- Sistema Conexão Dança — Perfis (roles_sistema) base
-- Cria/atualiza roles com permissoes JSON padronizado (módulos → ações)

BEGIN;

-- Helper: padrão JSON para módulos
-- Estrutura esperada pela UI:
-- {
--   "modules": {
--     "pessoas": { "view": true, "create": false, "update": false, "delete": false },
--     ...
--   }
-- }

-- ADMIN (tudo)
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'ADMIN',
  'Administrador',
  'Acesso total ao sistema.',
  '{
    "modules": {
      "admin":              { "view": true, "create": true, "update": true, "delete": true },
      "pessoas":            { "view": true, "create": true, "update": true, "delete": true },
      "colaboradores":      { "view": true, "create": true, "update": true, "delete": true },
      "academico":          { "view": true, "create": true, "update": true, "delete": true },
      "matriculas":         { "view": true, "create": true, "update": true, "delete": true },
      "financeiro":         { "view": true, "create": true, "update": true, "delete": true },
      "loja_operacao":      { "view": true, "create": true, "update": true, "delete": true },
      "loja_admin":         { "view": true, "create": true, "update": true, "delete": true },
      "ballet_cafe":        { "view": true, "create": true, "update": true, "delete": true },
      "comunicacao":        { "view": true, "create": true, "update": true, "delete": true },
      "relatorios":         { "view": true, "create": true, "update": true, "delete": true },
      "auditoria":          { "view": true, "create": true, "update": true, "delete": true },
      "usuarios_seguranca": { "view": true, "create": true, "update": true, "delete": true }
    }
  }'::jsonb,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- LOJA_OPERACAO (somente loja operacional + pessoas (ver/criar/editar))
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'LOJA_OPERACAO',
  'Loja — Operação (Caixa)',
  'Acesso apenas ao contexto Loja (operação) e a Pessoas para cadastro rápido.',
  '{
    "modules": {
      "admin":              { "view": false, "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": true,  "update": true,  "delete": false },
      "colaboradores":      { "view": false, "create": false, "update": false, "delete": false },
      "academico":          { "view": false, "create": false, "update": false, "delete": false },
      "matriculas":         { "view": false, "create": false, "update": false, "delete": false },
      "financeiro":         { "view": false, "create": false, "update": false, "delete": false },
      "loja_operacao":      { "view": true,  "create": true,  "update": true,  "delete": false },
      "loja_admin":         { "view": false, "create": false, "update": false, "delete": false },
      "ballet_cafe":        { "view": false, "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": false, "create": false, "update": false, "delete": false },
      "relatorios":         { "view": false, "create": false, "update": false, "delete": false },
      "auditoria":          { "view": false, "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": false, "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- LOJA_GESTAO (loja operação + loja admin + pessoas + relatórios de loja)
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'LOJA_GESTAO',
  'Loja — Gestão',
  'Gestão completa da Loja (operação e admin) + Pessoas. Relatórios somente leitura.',
  '{
    "modules": {
      "admin":              { "view": false, "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": true,  "update": true,  "delete": false },
      "colaboradores":      { "view": false, "create": false, "update": false, "delete": false },
      "academico":          { "view": false, "create": false, "update": false, "delete": false },
      "matriculas":         { "view": false, "create": false, "update": false, "delete": false },
      "financeiro":         { "view": false, "create": false, "update": false, "delete": false },
      "loja_operacao":      { "view": true,  "create": true,  "update": true,  "delete": true  },
      "loja_admin":         { "view": true,  "create": true,  "update": true,  "delete": true  },
      "ballet_cafe":        { "view": false, "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": false, "create": false, "update": false, "delete": false },
      "relatorios":         { "view": true,  "create": false, "update": false, "delete": false },
      "auditoria":          { "view": false, "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": false, "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- FINANCEIRO_OPERACAO
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'FINANCEIRO_OPERACAO',
  'Financeiro — Operação',
  'Operação do Financeiro (contas a pagar/receber, recebimentos, etc.).',
  '{
    "modules": {
      "admin":              { "view": false, "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": false, "update": false, "delete": false },
      "colaboradores":      { "view": false, "create": false, "update": false, "delete": false },
      "academico":          { "view": false, "create": false, "update": false, "delete": false },
      "matriculas":         { "view": false, "create": false, "update": false, "delete": false },
      "financeiro":         { "view": true,  "create": true,  "update": true,  "delete": false },
      "loja_operacao":      { "view": false, "create": false, "update": false, "delete": false },
      "loja_admin":         { "view": false, "create": false, "update": false, "delete": false },
      "ballet_cafe":        { "view": false, "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": false, "create": false, "update": false, "delete": false },
      "relatorios":         { "view": true,  "create": false, "update": false, "delete": false },
      "auditoria":          { "view": false, "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": false, "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- SECRETARIA
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'SECRETARIA',
  'Secretaria',
  'Cadastros e fluxos administrativos do dia a dia (Pessoas, Matrículas, Acadêmico básico).',
  '{
    "modules": {
      "admin":              { "view": false, "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": true,  "update": true,  "delete": false },
      "colaboradores":      { "view": false, "create": false, "update": false, "delete": false },
      "academico":          { "view": true,  "create": true,  "update": true,  "delete": false },
      "matriculas":         { "view": true,  "create": true,  "update": true,  "delete": false },
      "financeiro":         { "view": false, "create": false, "update": false, "delete": false },
      "loja_operacao":      { "view": false, "create": false, "update": false, "delete": false },
      "loja_admin":         { "view": false, "create": false, "update": false, "delete": false },
      "ballet_cafe":        { "view": false, "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": true,  "create": true,  "update": true,  "delete": false },
      "relatorios":         { "view": true,  "create": false, "update": false, "delete": false },
      "auditoria":          { "view": false, "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": false, "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- COORDENACAO
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'COORDENACAO',
  'Coordenação',
  'Coordenação pedagógica (Acadêmico, Matrículas, Pessoas) e relatórios de leitura.',
  '{
    "modules": {
      "admin":              { "view": false, "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": true,  "update": true,  "delete": false },
      "colaboradores":      { "view": true,  "create": false, "update": false, "delete": false },
      "academico":          { "view": true,  "create": true,  "update": true,  "delete": false },
      "matriculas":         { "view": true,  "create": true,  "update": true,  "delete": false },
      "financeiro":         { "view": false, "create": false, "update": false, "delete": false },
      "loja_operacao":      { "view": false, "create": false, "update": false, "delete": false },
      "loja_admin":         { "view": false, "create": false, "update": false, "delete": false },
      "ballet_cafe":        { "view": false, "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": true,  "create": true,  "update": true,  "delete": false },
      "relatorios":         { "view": true,  "create": false, "update": false, "delete": false },
      "auditoria":          { "view": false, "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": false, "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

-- AUDITORIA (somente leitura + acesso ao módulo auditoria)
INSERT INTO public.roles_sistema (codigo, nome, descricao, permissoes, editavel, ativo)
VALUES (
  'AUDITORIA',
  'Auditoria (Somente leitura)',
  'Acesso de leitura aos módulos + acesso ao painel de auditoria.',
  '{
    "modules": {
      "admin":              { "view": true,  "create": false, "update": false, "delete": false },
      "pessoas":            { "view": true,  "create": false, "update": false, "delete": false },
      "colaboradores":      { "view": true,  "create": false, "update": false, "delete": false },
      "academico":          { "view": true,  "create": false, "update": false, "delete": false },
      "matriculas":         { "view": true,  "create": false, "update": false, "delete": false },
      "financeiro":         { "view": true,  "create": false, "update": false, "delete": false },
      "loja_operacao":      { "view": true,  "create": false, "update": false, "delete": false },
      "loja_admin":         { "view": true,  "create": false, "update": false, "delete": false },
      "ballet_cafe":        { "view": true,  "create": false, "update": false, "delete": false },
      "comunicacao":        { "view": true,  "create": false, "update": false, "delete": false },
      "relatorios":         { "view": true,  "create": false, "update": false, "delete": false },
      "auditoria":          { "view": true,  "create": false, "update": false, "delete": false },
      "usuarios_seguranca": { "view": true,  "create": false, "update": false, "delete": false }
    }
  }'::jsonb,
  true,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissoes = EXCLUDED.permissoes,
  editavel = EXCLUDED.editavel,
  ativo = EXCLUDED.ativo;

COMMIT;
