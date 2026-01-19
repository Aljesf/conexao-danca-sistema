BEGIN;

-- Corrigir erro de digitacao: 14+ -> 14
UPDATE public.loja_tamanhos
SET nome = '14'
WHERE nome = '14+'
  AND tipo = 'ROUPA';

-- Criar tamanho 16 se nao existir
INSERT INTO public.loja_tamanhos (nome, tipo, ordem, ativo)
SELECT '16', 'ROUPA', 16, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loja_tamanhos
  WHERE nome = '16' AND tipo = 'ROUPA'
);

COMMIT;
