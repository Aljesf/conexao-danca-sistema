BEGIN;

-- Indice unico parcial: apenas uma tabela ATIVA por escopo
CREATE UNIQUE INDEX IF NOT EXISTS uq_matricula_tabelas_escopo_ativo
ON public.matricula_tabelas (produto_tipo, referencia_tipo, referencia_id, ano_referencia)
WHERE ativo = true;

COMMIT;
