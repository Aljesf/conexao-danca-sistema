BEGIN;

-- Corrige 14+ -> 14 (se existir)
UPDATE public.loja_tamanhos
SET nome = '14'
WHERE tipo = 'ROUPA'
  AND nome = '14+';

-- Cria 14 se por algum motivo nao existir (seguranca)
INSERT INTO public.loja_tamanhos (nome, tipo, ordem, ativo)
SELECT '14', 'ROUPA', 14, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loja_tamanhos
  WHERE tipo = 'ROUPA' AND nome = '14'
);

-- Cria 16 se nao existir
INSERT INTO public.loja_tamanhos (nome, tipo, ordem, ativo)
SELECT '16', 'ROUPA', 16, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loja_tamanhos
  WHERE tipo = 'ROUPA' AND nome = '16'
);

COMMIT;
