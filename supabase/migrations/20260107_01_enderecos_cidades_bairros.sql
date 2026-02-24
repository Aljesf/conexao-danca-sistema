-- 20260107_01_enderecos_cidades_bairros.sql
-- Objetivo:
--  - Cidades e bairros como cadastros controlados
--  - Enderecos passam a referenciar cidade_id e bairro_id
--  - Manter colunas texto (cidade/bairro) por compatibilidade temporaria
--  - Popular dados a partir do que ja existe em enderecos (quando possivel)

BEGIN;
-- 1) Tabelas mestre
CREATE TABLE IF NOT EXISTS public.enderecos_cidades (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  uf text NOT NULL DEFAULT 'PA',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_cidades_nome_uf
  ON public.enderecos_cidades (lower(nome), uf);
CREATE TABLE IF NOT EXISTS public.enderecos_bairros (
  id bigserial PRIMARY KEY,
  cidade_id bigint NOT NULL REFERENCES public.enderecos_cidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_bairros_cidade_nome
  ON public.enderecos_bairros (cidade_id, lower(nome));
CREATE INDEX IF NOT EXISTS ix_enderecos_bairros_cidade
  ON public.enderecos_bairros (cidade_id);
-- 2) Adaptar tabela enderecos (ja existe no projeto)
-- Adiciona colunas FK sem remover as textuais.
ALTER TABLE public.enderecos
  ADD COLUMN IF NOT EXISTS cidade_id bigint NULL REFERENCES public.enderecos_cidades(id) ON DELETE SET NULL;
ALTER TABLE public.enderecos
  ADD COLUMN IF NOT EXISTS bairro_id bigint NULL REFERENCES public.enderecos_bairros(id) ON DELETE SET NULL;
-- 3) Migracao de dados (best-effort)
-- 3.1) Inserir cidades a partir de enderecos.cidade (quando existir)
INSERT INTO public.enderecos_cidades (nome, uf)
SELECT DISTINCT trim(e.cidade) AS nome, COALESCE(NULLIF(trim(e.uf), ''), 'PA') AS uf
FROM public.enderecos e
WHERE e.cidade IS NOT NULL AND trim(e.cidade) <> ''
ON CONFLICT DO NOTHING;
-- 3.2) Inserir bairros a partir de enderecos.bairro, amarrando na cidade
INSERT INTO public.enderecos_bairros (cidade_id, nome)
SELECT DISTINCT c.id AS cidade_id, trim(e.bairro) AS nome
FROM public.enderecos e
JOIN public.enderecos_cidades c
  ON lower(c.nome) = lower(trim(e.cidade))
 AND c.uf = COALESCE(NULLIF(trim(e.uf), ''), 'PA')
WHERE e.bairro IS NOT NULL AND trim(e.bairro) <> ''
  AND e.cidade IS NOT NULL AND trim(e.cidade) <> ''
ON CONFLICT DO NOTHING;
-- 3.3) Atualizar enderecos.cidade_id
UPDATE public.enderecos e
SET cidade_id = c.id
FROM public.enderecos_cidades c
WHERE e.cidade_id IS NULL
  AND e.cidade IS NOT NULL AND trim(e.cidade) <> ''
  AND lower(c.nome) = lower(trim(e.cidade))
  AND c.uf = COALESCE(NULLIF(trim(e.uf), ''), 'PA');
-- 3.4) Atualizar enderecos.bairro_id
UPDATE public.enderecos e
SET bairro_id = b.id
FROM public.enderecos_bairros b
JOIN public.enderecos_cidades c ON c.id = b.cidade_id
WHERE e.bairro_id IS NULL
  AND e.bairro IS NOT NULL AND trim(e.bairro) <> ''
  AND e.cidade_id = c.id
  AND lower(b.nome) = lower(trim(e.bairro));
COMMIT;
