BEGIN;
-- =========================================================
-- Seed oficial da ASE (Movimento Conexão Dança)
-- Fonte: "Metodologia de Análise Socioeconômica Unificada por Contexto"
-- =========================================================

-- 1) PERGUNTAS BLOCO R (Responsável) — R1..R16
INSERT INTO public.form_questions (codigo, titulo, descricao, tipo, ajuda, ativo)
VALUES
  ('ase_menor_r1_tempo_participacao', 'R1 — Tempo de participação', 'Há quanto tempo seu filho(a) participa do Conexão Dança / Movimento Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_r2_experiencia_marcante', 'R2 — Experiência marcante', 'Na sua percepção, o que mais marcou a experiência do seu filho(a) no Conexão Dança até agora?', 'textarea', NULL, true),
  ('ase_menor_r3_rotina_permanencia', 'R3 — Rotina e permanência', 'Considerando a rotina atual da família, você acredita que é possível manter a frequência e o compromisso com as atividades do Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_r4_dialogo_disponivel', 'R4 — Disponibilidade de diálogo', 'Quando surgem dúvidas ou dificuldades, você sente que o Conexão Dança está disponível para dialogar com a família?', 'single_choice', NULL, true),
  ('ase_menor_r5_necessita_apoio_percepcao', 'R5 — Necessidade de apoio institucional (percepção)', 'No momento atual, você considera que seu filho(a) necessita de apoio institucional para permanecer no Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_r6_renda_faixa', 'R6 — Renda familiar (faixas)', 'Para fins de análise institucional e relatórios de impacto, indique a faixa aproximada de renda familiar.', 'single_choice', NULL, true),
  ('ase_menor_r7_fonte_renda', 'R7 — Principal fonte de renda', 'Principal fonte de renda da família.', 'single_choice', NULL, true),
  ('ase_menor_r8_condicao_pagamento_integral', 'R8 — Condição de pagamento integral', 'No momento atual, a família possui condições financeiras de arcar integralmente com o valor da mensalidade do Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_r9_declara_necessidade_apoio', 'R9 — Declaração de necessidade de apoio (formal)', 'Caso a resposta seja "parcialmente" ou "não", a família declara que necessita de apoio institucional para viabilizar a permanência do aluno(a)?', 'single_choice', 'Exibida somente quando R8 for "parcialmente" ou "não".', true),
  ('ase_menor_r10_identidade_racial', 'R10 — Identidade racial do responsável (estatística)', 'Para fins estatísticos, o responsável se identifica como:', 'single_choice', 'Opcional/recomendado.', true),
  ('ase_menor_r11_motivo_permanencia_familia', 'R11 — Motivo de permanência (família)', 'O que faz sua família continuar caminhando com o Conexão Dança?', 'textarea', NULL, true),
  ('ase_menor_r12_parceria_positiva', 'R12 — Parceria positiva (família)', 'De que forma você acredita que essa relação entre sua família e o Movimento pode continuar sendo uma parceria positiva?', 'textarea', NULL, true),
  ('ase_menor_r13_reconhece_compromisso_familiar', 'R13 — Reconhecimento do compromisso familiar', 'A família compreende que a permanência do aluno depende também de compromisso com frequência, disciplina e diálogo com a escola?', 'single_choice', NULL, true),
  ('ase_menor_r14_como_familia_colabora', 'R14 — Como a família colabora', 'De que forma a família se compromete a colaborar com o processo formativo do aluno(a)?', 'textarea', NULL, true),
  ('ase_menor_r15_ciencia_institucional', 'R15 — Ciência institucional (responsável)', 'Declarações (marcar):', 'multi_choice', NULL, true),
  ('ase_menor_r16_declaracao_final_autorizacao', 'R16 — Declaração final e autorização de uso institucional', 'Declarações (marcar): informações verdadeiras; ciência de revisibilidade; autorização de uso institucional consolidado.', 'multi_choice', NULL, true)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  ajuda = EXCLUDED.ajuda,
  ativo = EXCLUDED.ativo,
  updated_at = now();
-- opções R1
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('menos_1_ano','menos de 1 ano',0),
  ('entre_1_2','entre 1 e 2 anos',1),
  ('mais_2','mais de 2 anos',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r1_tempo_participacao'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R3/R4/R5/R8
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('parcialmente','parcialmente',1),
  ('nao','não',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo IN (
  'ase_menor_r4_dialogo_disponivel',
  'ase_menor_r5_necessita_apoio_percepcao',
  'ase_menor_r8_condicao_pagamento_integral'
)
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- R3 tem texto diferente
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('com_esforco','com algum esforço',1),
  ('reorganizando','estamos reorganizando nossa rotina',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r3_rotina_permanencia'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R6
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('ate_1_sm','até 1 SM',0),
  ('1_2_sm','1-2 SM',1),
  ('2_3_sm','2-3 SM',2),
  ('acima_3_sm','acima de 3 SM',3)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r6_renda_faixa'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R7
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('emprego_formal','emprego formal',0),
  ('trabalho_informal','trabalho informal',1),
  ('autonomo','autônomo',2),
  ('beneficio_governo','benefício governamental',3),
  ('outra','outra',4)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r7_fonte_renda'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R9 (sim/não)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('nao','não',1)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r9_declara_necessidade_apoio'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R10
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('preta','preta',0),
  ('parda','parda',1),
  ('branca','branca',2),
  ('amarela','amarela',3),
  ('indigena','indígena',4),
  ('prefiro_nao_declarar','prefiro não declarar',5)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r10_identidade_racial'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R13 (sim/não)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('nao','não',1)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r13_reconhece_compromisso_familiar'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R15 (multi)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('compreendo_criterios_revisaveis','compreendo que o apoio institucional segue critérios responsáveis e revisáveis',0),
  ('reconheco_compromisso_familiar','reconheço a importância do compromisso familiar na permanência do aluno',1),
  ('concordo_parceria','concordo em seguir caminhando em parceria com o Conexão Dança',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r15_ciencia_institucional'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções R16 (multi)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('informacoes_verdadeiras','declaro que as informações prestadas são verdadeiras',0),
  ('ciencia_revisibilidade','tenho ciência de que o apoio institucional é revisável conforme critérios',1),
  ('autorizo_uso_consolidado','autorizo o uso institucional consolidado dos dados para fins de relatório/impacto',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_r16_declaracao_final_autorizacao'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- 2) PERGUNTAS BLOCO A (Aluno menor) — A1..A7
INSERT INTO public.form_questions (codigo, titulo, descricao, tipo, ajuda, ativo)
VALUES
  ('ase_menor_a1_oque_mais_gosta', 'A1 — O que mais gosta', 'O que você mais gosta no Conexão Dança?', 'textarea', NULL, true),
  ('ase_menor_a2_como_se_sente', 'A2 — Como se sente', 'Como você se sente quando está no Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_a3_oque_a_danca_e', 'A3 — O que a dança é', 'Para você, a dança hoje é mais:', 'single_choice', NULL, true),
  ('ase_menor_a4_participacao_nas_aulas', 'A4 — Participação nas aulas', 'Você gosta de participar das aulas e atividades?', 'single_choice', 'Recomendado.', true),
  ('ase_menor_a5_desejo_continuar', 'A5 — Desejo de continuar', 'Você gostaria de continuar fazendo parte do Conexão Dança?', 'single_choice', NULL, true),
  ('ase_menor_a6_compromisso_aluno', 'A6 — Compromisso do aluno', 'Você se compromete a cuidar do espaço, respeitar colegas e professores e dar o seu melhor nas aulas?', 'single_choice', NULL, true),
  ('ase_menor_a7_observacao_institucional', 'A7 — Observação/entrevista institucional', 'Observação institucional/entrevista mediada do aluno.', 'textarea', 'Opcional (preenchido por colaborador quando necessário).', true)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  ajuda = EXCLUDED.ajuda,
  ativo = EXCLUDED.ativo,
  updated_at = now();
-- opções A2
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('muito_feliz','muito feliz',0),
  ('bem','bem',1),
  ('adaptando','ainda me adaptando',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_a2_como_se_sente'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções A3
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('aprendizado','um aprendizado',0),
  ('expressar','uma forma de se expressar',1),
  ('futuro','algo que quero levar para o futuro',2),
  ('lugar_bem','um lugar onde me sinto bem',3)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_a3_oque_a_danca_e'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções A4
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('mais_ou_menos','mais ou menos',1),
  ('acostumando','ainda estou me acostumando',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_a4_participacao_nas_aulas'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções A5
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('sim_organizar','sim, mas preciso me organizar melhor',1),
  ('pensando','ainda estou pensando',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_a5_desejo_continuar'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções A6
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('vou_tentar','vou tentar sempre',1)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_menor_a6_compromisso_aluno'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- 3) PERGUNTAS BLOCO 18+ (Aluno maior) — M1..M14
INSERT INTO public.form_questions (codigo, titulo, descricao, tipo, ajuda, ativo)
VALUES
  ('ase_18_m1_ocupacao_principal', 'M1 — Ocupação principal', 'Sua principal ocupação hoje é:', 'single_choice', NULL, true),
  ('ase_18_m2_renda_faixa', 'M2 — Renda mensal (faixas)', 'Renda mensal aproximada', 'single_choice', NULL, true),
  ('ase_18_m3_condicao_pagamento_integral', 'M3 — Condição de pagamento integral', 'Você possui condições financeiras de arcar integralmente com a mensalidade?', 'single_choice', NULL, true),
  ('ase_18_m4_declara_necessidade_apoio', 'M4 — Declaração de necessidade de apoio (formal)', 'Caso não possua, declara necessidade de apoio institucional?', 'single_choice', 'Exibida somente quando M3 for "parcialmente" ou "não".', true),
  ('ase_18_m5_tempo_no_conexao', 'M5 — Tempo no Conexão Dança', 'Há quanto tempo você participa do Conexão Dança?', 'single_choice', NULL, true),
  ('ase_18_m6_oque_marcou_trajetoria', 'M6 — O que marcou a trajetória', 'O que mais marcou sua trajetória no Conexão Dança até agora?', 'textarea', NULL, true),
  ('ase_18_m7_oque_representa_hoje', 'M7 — O que representa hoje', 'O que o Conexão Dança representa hoje para você?', 'textarea', NULL, true),
  ('ase_18_m8_frequencia_compromisso', 'M8 — Capacidade de frequência/compromisso', 'Você sente que consegue manter frequência e compromisso com as atividades neste momento?', 'single_choice', NULL, true),
  ('ase_18_m9_necessita_apoio_percepcao', 'M9 — Necessidade de apoio institucional (percepção)', 'No momento atual, você considera que necessita de apoio institucional para permanecer?', 'single_choice', NULL, true),
  ('ase_18_m10_identidade_racial', 'M10 — Identidade racial (estatística)', 'Se desejar, você se identifica como:', 'single_choice', 'Opcional/recomendado.', true),
  ('ase_18_m11_motivo_permanencia', 'M11 — Motivo de permanência', 'O que faz você continuar caminhando com o Conexão Dança?', 'textarea', NULL, true),
  ('ase_18_m12_parceria_positiva_futuro', 'M12 — Parceria positiva / futuro', 'De que forma você acredita que essa relação pode continuar sendo uma parceria positiva para você e para o Movimento?', 'textarea', NULL, true),
  ('ase_18_m13_ciencia_institucional', 'M13 — Ciência institucional (18+)', 'Declarações (marcar):', 'multi_choice', NULL, true),
  ('ase_18_m14_declaracao_final', 'M14 — Declaração final (18+)', 'Declarações (marcar):', 'multi_choice', NULL, true)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  tipo = EXCLUDED.tipo,
  ajuda = EXCLUDED.ajuda,
  ativo = EXCLUDED.ativo,
  updated_at = now();
-- opções M1
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('estudo','estudo',0),
  ('trabalho','trabalho',1),
  ('estudo_trabalho','estudo e trabalho',2),
  ('transicao','outro momento de transição',3)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m1_ocupacao_principal'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M2 (mesmas faixas)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('ate_1_sm','até 1 SM',0),
  ('1_2_sm','1-2 SM',1),
  ('2_3_sm','2-3 SM',2),
  ('acima_3_sm','acima de 3 SM',3)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m2_renda_faixa'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M3 (sim/parcialmente/não)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('parcialmente','parcialmente',1),
  ('nao','não',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo IN ('ase_18_m3_condicao_pagamento_integral','ase_18_m9_necessita_apoio_percepcao')
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M4 (sim/não)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('nao','não',1)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m4_declara_necessidade_apoio'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M5
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('menos_1_ano','menos de 1 ano',0),
  ('mais_1_ano','mais de 1 ano',1)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m5_tempo_no_conexao'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M8
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('sim','sim',0),
  ('com_esforco','com algum esforço',1),
  ('reorganizando','estou reorganizando minha rotina',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m8_frequencia_compromisso'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M10
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('preta','preta',0),
  ('parda','parda',1),
  ('branca','branca',2),
  ('amarela','amarela',3),
  ('indigena','indígena',4),
  ('prefiro_nao_responder','prefiro não responder',5)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m10_identidade_racial'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M13 (multi)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('compreendo_criterios_revisaveis','compreendo que o apoio institucional segue critérios responsáveis e revisáveis',0),
  ('reconheco_compromisso','reconheço meu compromisso com frequência, conduta e responsabilidade',1),
  ('concordo_parceria','concordo em seguir caminhando em parceria com o Conexão Dança',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m13_ciencia_institucional'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- opções M14 (multi) — declaração final (modelo simples para o digital; assinatura no impresso)
INSERT INTO public.form_question_options (question_id, valor, rotulo, ordem, ativo)
SELECT q.id, v.valor, v.rotulo, v.ordem, true
FROM public.form_questions q
JOIN (VALUES
  ('informacoes_verdadeiras','declaro que as informações prestadas são verdadeiras',0),
  ('ciencia_revisibilidade','tenho ciência de que esta análise é revisável e pode ser solicitada novamente',1),
  ('concordo_compromisso','reafirmo meu compromisso com frequência, conduta e responsabilidade',2)
) AS v(valor, rotulo, ordem) ON true
WHERE q.codigo = 'ase_18_m14_declaracao_final'
ON CONFLICT (question_id, valor) DO UPDATE SET rotulo = EXCLUDED.rotulo, ordem = EXCLUDED.ordem, ativo = true, updated_at = now();
-- =========================================================
-- 4) TEMPLATES oficiais
-- =========================================================

-- ASE-18+
INSERT INTO public.form_templates (nome, descricao, status, versao, published_at)
VALUES
  ('ASE — Movimento — 18+ (Aluno maior)', 'Análise Socioeconômica (ASE) — contexto aluno maior de idade.', 'published', 1, now())
ON CONFLICT DO NOTHING;
-- ASE-MENOR
INSERT INTO public.form_templates (nome, descricao, status, versao, published_at)
VALUES
  ('ASE — Movimento — MENOR (Responsável + Aluno)', 'Análise Socioeconômica (ASE) — contexto aluno menor, com voz do responsável e voz do aluno.', 'published', 1, now())
ON CONFLICT DO NOTHING;
-- Obter IDs dos templates
WITH t AS (
  SELECT id, nome FROM public.form_templates
  WHERE nome IN (
    'ASE — Movimento — 18+ (Aluno maior)',
    'ASE — Movimento — MENOR (Responsável + Aluno)'
  )
)
SELECT 1;
-- Limpar itens anteriores (se existirem) e recriar (idempotente)
DELETE FROM public.form_template_items
WHERE template_id IN (
  SELECT id FROM public.form_templates
  WHERE nome IN (
    'ASE — Movimento — 18+ (Aluno maior)',
    'ASE — Movimento — MENOR (Responsável + Aluno)'
  )
);
-- Itens ASE-18+
INSERT INTO public.form_template_items (template_id, question_id, ordem, obrigatoria, cond_question_id, cond_equals_value)
SELECT
  tpl.id,
  q.id,
  v.ordem,
  true,
  x.cond_qid,
  v.cond_val
FROM public.form_templates tpl
JOIN (
  VALUES
    ('ase_18_m1_ocupacao_principal',0,NULL,NULL),
    ('ase_18_m2_renda_faixa',1,NULL,NULL),
    ('ase_18_m3_condicao_pagamento_integral',2,NULL,NULL),
    ('ase_18_m4_declara_necessidade_apoio',3,'ase_18_m3_condicao_pagamento_integral','parcialmente|nao'),
    ('ase_18_m5_tempo_no_conexao',4,NULL,NULL),
    ('ase_18_m6_oque_marcou_trajetoria',5,NULL,NULL),
    ('ase_18_m7_oque_representa_hoje',6,NULL,NULL),
    ('ase_18_m8_frequencia_compromisso',7,NULL,NULL),
    ('ase_18_m9_necessita_apoio_percepcao',8,NULL,NULL),
    ('ase_18_m10_identidade_racial',9,NULL,NULL),
    ('ase_18_m11_motivo_permanencia',10,NULL,NULL),
    ('ase_18_m12_parceria_positiva_futuro',11,NULL,NULL),
    ('ase_18_m13_ciencia_institucional',12,NULL,NULL),
    ('ase_18_m14_declaracao_final',13,NULL,NULL)
) AS v(codigo, ordem, cond_codigo, cond_val)
  ON true
JOIN public.form_questions q ON q.codigo = v.codigo
LEFT JOIN public.form_questions cq ON cq.codigo = v.cond_codigo
CROSS JOIN LATERAL (
  SELECT cq.id AS cond_qid
) x
WHERE tpl.nome = 'ASE — Movimento — 18+ (Aluno maior)';
-- Itens ASE-MENOR (R1..R16, A1..A7)
INSERT INTO public.form_template_items (template_id, question_id, ordem, obrigatoria, cond_question_id, cond_equals_value)
SELECT
  tpl.id,
  q.id,
  v.ordem,
  v.obrigatoria,
  x.cond_qid,
  v.cond_val
FROM public.form_templates tpl
JOIN (
  VALUES
    ('ase_menor_r1_tempo_participacao',0,true,NULL,NULL),
    ('ase_menor_r2_experiencia_marcante',1,true,NULL,NULL),
    ('ase_menor_r3_rotina_permanencia',2,true,NULL,NULL),
    ('ase_menor_r4_dialogo_disponivel',3,true,NULL,NULL),
    ('ase_menor_r5_necessita_apoio_percepcao',4,true,NULL,NULL),
    ('ase_menor_r6_renda_faixa',5,true,NULL,NULL),
    ('ase_menor_r7_fonte_renda',6,true,NULL,NULL),
    ('ase_menor_r8_condicao_pagamento_integral',7,true,NULL,NULL),
    ('ase_menor_r9_declara_necessidade_apoio',8,true,'ase_menor_r8_condicao_pagamento_integral','parcialmente|nao'),
    ('ase_menor_r10_identidade_racial',9,false,NULL,NULL),
    ('ase_menor_r11_motivo_permanencia_familia',10,true,NULL,NULL),
    ('ase_menor_r12_parceria_positiva',11,true,NULL,NULL),
    ('ase_menor_r13_reconhece_compromisso_familiar',12,true,NULL,NULL),
    ('ase_menor_r14_como_familia_colabora',13,true,NULL,NULL),
    ('ase_menor_r15_ciencia_institucional',14,true,NULL,NULL),
    ('ase_menor_r16_declaracao_final_autorizacao',15,true,NULL,NULL),
    ('ase_menor_a1_oque_mais_gosta',16,true,NULL,NULL),
    ('ase_menor_a2_como_se_sente',17,true,NULL,NULL),
    ('ase_menor_a3_oque_a_danca_e',18,true,NULL,NULL),
    ('ase_menor_a4_participacao_nas_aulas',19,false,NULL,NULL),
    ('ase_menor_a5_desejo_continuar',20,true,NULL,NULL),
    ('ase_menor_a6_compromisso_aluno',21,true,NULL,NULL),
    ('ase_menor_a7_observacao_institucional',22,false,NULL,NULL)
) AS v(codigo, ordem, obrigatoria, cond_codigo, cond_val)
  ON true
JOIN public.form_questions q ON q.codigo = v.codigo
LEFT JOIN public.form_questions cq ON cq.codigo = v.cond_codigo
CROSS JOIN LATERAL (
  SELECT cq.id AS cond_qid
) x
WHERE tpl.nome = 'ASE — Movimento — MENOR (Responsável + Aluno)';
COMMIT;
