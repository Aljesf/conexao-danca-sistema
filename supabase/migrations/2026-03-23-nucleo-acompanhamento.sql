CREATE TABLE IF NOT EXISTS public.nucleo_membro_acompanhamento (
id BIGSERIAL PRIMARY KEY,

nucleo_membro_id BIGINT NOT NULL
REFERENCES public.nucleo_membros(id)
ON DELETE CASCADE,

data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,

status_participacao TEXT NOT NULL DEFAULT 'ATIVO',

nota_desempenho NUMERIC(5,2),

frequencia_percentual NUMERIC(5,2),

observacao TEXT,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_nucleo_acomp_membro
ON public.nucleo_membro_acompanhamento (nucleo_membro_id);

CREATE INDEX IF NOT EXISTS idx_nucleo_acomp_data
ON public.nucleo_membro_acompanhamento (data_referencia);
