BEGIN;

-- Diagnostico (deve mostrar os nomes "quebrados" antes do update)
SELECT id, codigo, nome
FROM public.loja_produtos
WHERE codigo IN ('UNIF-INF-C5','UNIF-ADU-C5')
ORDER BY codigo;

-- Correcao: regrava o nome corretamente (UTF-8)
UPDATE public.loja_produtos
SET nome = 'Uniforme Conexão Dança Infantil - C5',
    updated_at = now()
WHERE codigo = 'UNIF-INF-C5';

UPDATE public.loja_produtos
SET nome = 'Uniforme Conexão Dança Adulto - C5',
    updated_at = now()
WHERE codigo = 'UNIF-ADU-C5';

COMMIT;

-- Validacao pos-correcao
SELECT id, codigo, nome
FROM public.loja_produtos
WHERE codigo IN ('UNIF-INF-C5','UNIF-ADU-C5')
ORDER BY codigo;

-- (Opcional) conferencia da sessao
SHOW client_encoding;
