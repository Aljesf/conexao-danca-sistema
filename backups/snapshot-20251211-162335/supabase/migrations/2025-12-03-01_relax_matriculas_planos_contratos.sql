-- Migration: Relaxar obrigatoriedade de plano_matricula_id e contrato_modelo_id em matriculas
-- Contexto:
--   Na fase atual, a API /api/matriculas/novo ainda não faz integração
--   com planos financeiros nem contratos emitidos. As colunas
--   plano_matricula_id e contrato_modelo_id serão usadas em uma etapa futura.
--
-- Objetivo:
--   Permitir criação de matrículas sem exigir esses vínculos, tornando
--   as colunas nullable (DROP NOT NULL), mantendo os FKs para uso futuro.

ALTER TABLE public.matriculas
  ALTER COLUMN plano_matricula_id DROP NOT NULL,
  ALTER COLUMN contrato_modelo_id DROP NOT NULL;
