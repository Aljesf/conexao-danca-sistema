-- [INICIO DO BLOCO] supabase/migrations/<timestamp>_rollback_precificacao_cursos_livres_duplicada.sql

-- ATENCAO:
-- Este rollback remove a precificacao duplicada de cursos livres,
-- mantendo a fonte unica no modulo "Tabela de precos (Escola)" existente.

DROP TABLE IF EXISTS public.escola_precos_cursos_livres_itens;
DROP TABLE IF EXISTS public.escola_precos_cursos_livres;

-- [FIM DO BLOCO]