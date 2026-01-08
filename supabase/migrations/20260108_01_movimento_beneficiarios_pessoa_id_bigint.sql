/*
  Alinhamento com public.pessoas.id (bigserial/bigint)
*/

BEGIN;

-- 1) Alterar pessoa_id de uuid -> bigint
-- Observacao: assumimos que ainda nao existem registros com UUID valido em pessoa_id.
-- Se existirem, esta alteracao falhara e precisaremos de estrategia de migracao.
ALTER TABLE IF EXISTS public.movimento_beneficiarios
  ALTER COLUMN pessoa_id TYPE bigint
  USING pessoa_id::bigint;

-- 2) FK agora que sabemos a tabela real
DO $$ BEGIN
  ALTER TABLE public.movimento_beneficiarios
    ADD CONSTRAINT movimento_beneficiarios_pessoa_id_fkey
    FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Indice para pessoa_id
CREATE INDEX IF NOT EXISTS idx_mov_beneficiarios_pessoa_id
  ON public.movimento_beneficiarios(pessoa_id);

-- 4) Atualizar view de resumo (recompila)
CREATE OR REPLACE VIEW public.vw_movimento_beneficiarios_creditos_resumo AS
SELECT
  b.id AS beneficiario_id,
  b.pessoa_id,
  b.status,
  COUNT(mc.id) FILTER (WHERE mc.status = 'ATIVO') AS creditos_ativos_qtd,
  COALESCE(
    SUM(mc.quantidade_total - mc.quantidade_consumida) FILTER (WHERE mc.status = 'ATIVO'),
    0
  ) AS saldo_creditos_ativos
FROM public.movimento_beneficiarios b
LEFT JOIN public.movimento_creditos mc
  ON mc.beneficiario_id = b.id
GROUP BY b.id, b.pessoa_id, b.status;

COMMIT;
