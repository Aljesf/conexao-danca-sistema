-- 20260112_000102_seed_calendario_2026.sql
-- Objetivo: popular calendario 2026 com UPSERT usando constraints.

BEGIN;

-- 1) Periodo letivo 2026 (upsert por codigo)
INSERT INTO public.periodos_letivos (codigo, titulo, ano_referencia, data_inicio, data_fim, inicio_letivo_janeiro, ativo, observacoes)
VALUES ('2026', 'Período Letivo 2026', 2026, DATE '2026-01-12', DATE '2026-12-19', DATE '2026-01-12', TRUE, 'Calendário letivo provisório 2026 (carga inicial).')
ON CONFLICT (codigo) DO UPDATE
  SET titulo = EXCLUDED.titulo,
      ano_referencia = EXCLUDED.ano_referencia,
      data_inicio = EXCLUDED.data_inicio,
      data_fim = EXCLUDED.data_fim,
      inicio_letivo_janeiro = EXCLUDED.inicio_letivo_janeiro,
      ativo = TRUE;

-- 2) Faixas macro
INSERT INTO public.periodos_letivos_faixas (periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, data_inicio, data_fim, sem_aula, em_avaliacao)
VALUES (
  (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
  'ACADEMICO',
  'SEMESTRE',
  '1',
  '1º Semestre',
  NULL,
  DATE '2026-01-12',
  DATE '2026-06-19',
  FALSE,
  FALSE
)
ON CONFLICT ON CONSTRAINT periodos_letivos_faixas_uk DO NOTHING;

INSERT INTO public.periodos_letivos_faixas (periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, data_inicio, data_fim, sem_aula, em_avaliacao)
VALUES (
  (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
  'ACADEMICO',
  'FERIAS',
  NULL,
  'Férias Escolares',
  'Julho sem aulas regulares',
  DATE '2026-06-22',
  DATE '2026-07-31',
  TRUE,
  FALSE
)
ON CONFLICT ON CONSTRAINT periodos_letivos_faixas_uk DO NOTHING;

INSERT INTO public.periodos_letivos_faixas (periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, data_inicio, data_fim, sem_aula, em_avaliacao)
VALUES (
  (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
  'ACADEMICO',
  'SEMESTRE',
  '2',
  '2º Semestre',
  NULL,
  DATE '2026-08-03',
  DATE '2026-12-19',
  FALSE,
  FALSE
)
ON CONFLICT ON CONSTRAINT periodos_letivos_faixas_uk DO NOTHING;

INSERT INTO public.periodos_letivos_faixas (periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, data_inicio, data_fim, sem_aula, em_avaliacao)
VALUES (
  (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
  'ACADEMICO',
  'AVALIACOES',
  'FINAIS',
  'Avaliações Finais',
  NULL,
  DATE '2026-11-23',
  DATE '2026-11-27',
  FALSE,
  FALSE
)
ON CONFLICT ON CONSTRAINT periodos_letivos_faixas_uk DO NOTHING;

-- 3) Itens institucionais
INSERT INTO public.calendario_itens_institucionais
(periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, data_inicio, data_fim, sem_aula, ponto_facultativo, em_avaliacao, visibilidade, escopo)
SELECT
  (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
  v.dominio,
  v.categoria,
  v.subcategoria,
  v.titulo,
  v.descricao,
  v.data_inicio,
  v.data_fim,
  v.sem_aula,
  v.ponto_facultativo,
  v.em_avaliacao,
  v.visibilidade,
  v.escopo
FROM (VALUES
  ('ACADEMICO','SEM_AULA','NACIONAL','Carnaval (Segunda-feira)',NULL,DATE '2026-02-16',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','NACIONAL','Carnaval (Terça-feira)',NULL,DATE '2026-02-17',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','INSTITUCIONAL','Quarta-feira de Cinzas','Regra institucional: sem aula.',DATE '2026-02-18',NULL,TRUE,FALSE,FALSE,'ESCOLA','INSTITUCIONAL'),

  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Dia Mundial do Teatro',NULL,DATE '2026-03-27',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),

  ('ACADEMICO','SEM_AULA','NACIONAL','Sexta-feira Santa',NULL,DATE '2026-04-03',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','INSTITUCIONAL','Ponto facultativo (em avaliação)',NULL,DATE '2026-04-20',NULL,TRUE,TRUE,TRUE,'ESCOLA','INSTITUCIONAL'),
  ('ACADEMICO','SEM_AULA','NACIONAL','Tiradentes',NULL,DATE '2026-04-21',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Dia Internacional da Dança','Possível ação/evento em avaliação.',DATE '2026-04-29',NULL,FALSE,FALSE,TRUE,'ESCOLA',NULL),

  ('ACADEMICO','SEM_AULA','NACIONAL','Dia do Trabalho',NULL,DATE '2026-05-01',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),

  ('ACADEMICO','SEM_AULA','NACIONAL','Corpus Christi',NULL,DATE '2026-06-04',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','INSTITUCIONAL','Ponto facultativo (em avaliação)',NULL,DATE '2026-06-05',NULL,TRUE,TRUE,TRUE,'ESCOLA','INSTITUCIONAL'),

  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Dia Nacional da Cultura Hip Hop',NULL,DATE '2026-08-12',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),

  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Dia do Bailarino/Bailarina','Possível ação/evento em avaliação.',DATE '2026-09-01',NULL,FALSE,FALSE,TRUE,'ESCOLA',NULL),
  ('ACADEMICO','SEM_AULA','NACIONAL','Independência do Brasil',NULL,DATE '2026-09-07',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','MUNICIPAL','Feriado municipal de Salinópolis',NULL,DATE '2026-09-08',NULL,TRUE,FALSE,FALSE,'ESCOLA','MUNICIPAL'),

  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Trasladação (referência cultural)',NULL,DATE '2026-10-10',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),
  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Círio de Nazaré (referência cultural)',NULL,DATE '2026-10-11',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),
  ('ACADEMICO','SEM_AULA','NACIONAL','Nossa Senhora Aparecida / Pós-Círio',NULL,DATE '2026-10-12',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','MUNICIPAL','Aniversário de Salinópolis',NULL,DATE '2026-10-22',NULL,TRUE,FALSE,FALSE,'ESCOLA','MUNICIPAL'),
  ('ACADEMICO','SEM_AULA','INSTITUCIONAL','Ponto facultativo (em avaliação)',NULL,DATE '2026-10-23',NULL,TRUE,TRUE,TRUE,'ESCOLA','INSTITUCIONAL'),
  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Recírio (referência cultural)',NULL,DATE '2026-10-24',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),

  ('ACADEMICO','SEM_AULA','NACIONAL','Finados',NULL,DATE '2026-11-02',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),
  ('ACADEMICO','SEM_AULA','NACIONAL','Consciência Negra',NULL,DATE '2026-11-20',NULL,TRUE,FALSE,FALSE,'ESCOLA','NACIONAL'),

  ('ACADEMICO','SEM_AULA','INSTITUCIONAL','Ponto facultativo (em avaliação)',NULL,DATE '2026-12-07',NULL,TRUE,TRUE,TRUE,'ESCOLA','INSTITUCIONAL'),
  ('ACADEMICO','SEM_AULA','ESTADUAL','Imaculada Conceição (PA)',NULL,DATE '2026-12-08',NULL,TRUE,FALSE,FALSE,'ESCOLA','ESTADUAL'),
  ('ACADEMICO','PROGRAMA_SAZONAL',NULL,'Vila Encantada / Natal Encantado','Ambientação, ensaios e programação cultural/comunitária.',DATE '2026-12-01',DATE '2026-12-25',FALSE,FALSE,FALSE,'ESCOLA',NULL),
  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Encerramento do ano letivo',NULL,DATE '2026-12-19',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL),
  ('ACADEMICO','REFERENCIA_CULTURAL',NULL,'Encerramento do Natal Encantado',NULL,DATE '2026-12-25',NULL,FALSE,FALSE,FALSE,'ESCOLA',NULL)
) AS v(dominio,categoria,subcategoria,titulo,descricao,data_inicio,data_fim,sem_aula,ponto_facultativo,em_avaliacao,visibilidade,escopo)
ON CONFLICT DO NOTHING;

-- 4) Evento interno: Festival Cultural / Mostra (horario padrao)
INSERT INTO public.eventos_internos
(periodo_letivo_id, dominio, categoria, subcategoria, titulo, descricao, inicio, fim, local, formato, status, origem_tipo, visibilidade, em_avaliacao, data_prevista)
SELECT
       (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1),
       'ACADEMICO',
       'EVENTO_INTERNO',
       'MOSTRA',
       'Festival Cultural / Mostra de Dança',
       NULL,
       '2026-06-20T19:00:00-03:00'::timestamptz,
       '2026-06-21T22:00:00-03:00'::timestamptz,
       NULL,
       'PRESENCIAL',
       'AGENDADO',
       'MANUAL',
       'ADMIN',
       FALSE,
       NULL
ON CONFLICT ON CONSTRAINT eventos_internos_uk DO NOTHING;

COMMIT;

-- Conferencias
SELECT * FROM public.periodos_letivos WHERE codigo='2026';

SELECT periodo_letivo_id, dominio, categoria, subcategoria, titulo, data_inicio, data_fim, sem_aula, em_avaliacao
FROM public.periodos_letivos_faixas
WHERE periodo_letivo_id = (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1)
ORDER BY data_inicio;

SELECT categoria, subcategoria, titulo, data_inicio, data_fim, sem_aula, ponto_facultativo, em_avaliacao, escopo
FROM public.calendario_itens_institucionais
WHERE periodo_letivo_id = (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1)
ORDER BY data_inicio, titulo;

SELECT titulo, inicio, fim, status, em_avaliacao, data_prevista
FROM public.eventos_internos
WHERE periodo_letivo_id = (SELECT id FROM public.periodos_letivos WHERE codigo='2026' LIMIT 1)
ORDER BY inicio;
