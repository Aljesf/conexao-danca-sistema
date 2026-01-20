BEGIN;

UPDATE public.form_questions
   SET titulo = 'O que você mais gosta de fazer no seu dia a dia? Pode ser algo simples, que te faz se sentir bem.',
       updated_at = now()
 WHERE codigo = 'ase_menor_a1_oque_mais_gosta';

UPDATE public.form_questions
   SET titulo = 'Como você sente que participa das aulas hoje?',
       updated_at = now()
 WHERE codigo = 'ase_menor_a4_participacao_nas_aulas';

UPDATE public.form_question_options
   SET rotulo = 'Participo com vontade e interesse',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_a4_participacao_nas_aulas')
   AND valor = 'sim';

UPDATE public.form_question_options
   SET rotulo = 'Às vezes consigo participar bem, às vezes tenho dificuldade',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_a4_participacao_nas_aulas')
   AND valor = 'mais_ou_menos';

UPDATE public.form_question_options
   SET rotulo = 'Ainda estou me soltando e aprendendo a participar',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_a4_participacao_nas_aulas')
   AND valor = 'acostumando';

UPDATE public.form_questions
   SET titulo = 'Se quiser, você pode deixar aqui qualquer observação que ache importante sobre você ou sua família.',
       updated_at = now()
 WHERE codigo = 'ase_menor_a7_observacao_institucional';

UPDATE public.form_questions
   SET titulo = 'Esta pergunta é apenas para fins de compreensão do perfil das famílias atendidas.
Como você se identifica racialmente?',
       updated_at = now()
 WHERE codigo = 'ase_menor_r10_identidade_racial';

UPDATE public.form_question_options
   SET rotulo = 'Branca',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'branca';

UPDATE public.form_question_options
   SET rotulo = 'Preta',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'preta';

UPDATE public.form_question_options
   SET rotulo = 'Parda',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'parda';

UPDATE public.form_question_options
   SET rotulo = 'Amarela',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'amarela';

UPDATE public.form_question_options
   SET rotulo = 'Indígena',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'indigena';

UPDATE public.form_question_options
   SET rotulo = 'Prefiro não informar',
       updated_at = now()
 WHERE question_id = (SELECT id FROM public.form_questions WHERE codigo = 'ase_menor_r10_identidade_racial')
   AND valor = 'prefiro_nao_declarar';

UPDATE public.form_questions
   SET titulo = 'Existe alguma experiência da sua vida que você sente que marcou quem você é hoje?
Fique à vontade para compartilhar apenas o que se sentir confortável.',
       updated_at = now()
 WHERE codigo = 'ase_18_m6_oque_marcou_trajetoria';

UPDATE public.form_questions
   SET titulo = 'Confirmo que as informações que compartilhei aqui são verdadeiras, dentro do que sei e consigo informar neste momento.',
       updated_at = now()
 WHERE codigo = 'declaracao_informacoes_verdadeiras';

COMMIT;
