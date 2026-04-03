-- Tabela principal de nucleos
CREATE TABLE IF NOT EXISTS public.nucleos (
id BIGSERIAL PRIMARY KEY,
nome TEXT NOT NULL,
categoria TEXT,
subcategoria TEXT,
tipo TEXT NOT NULL DEFAULT 'DURADOURO',
descricao TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice
CREATE INDEX IF NOT EXISTS idx_nucleos_nome
ON public.nucleos (nome);

CREATE TABLE IF NOT EXISTS public.nucleo_membros (
id BIGSERIAL PRIMARY KEY,
nucleo_id BIGINT NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
pessoa_id BIGINT NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
data_saida DATE,
ativo BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_nucleo_membros_nucleo
ON public.nucleo_membros (nucleo_id);

CREATE INDEX IF NOT EXISTS idx_nucleo_membros_pessoa
ON public.nucleo_membros (pessoa_id);

-- Evitar duplicidade ativa
CREATE UNIQUE INDEX IF NOT EXISTS unique_nucleo_membro_ativo
ON public.nucleo_membros (nucleo_id, pessoa_id)
WHERE ativo = TRUE;
