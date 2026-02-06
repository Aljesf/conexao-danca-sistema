BEGIN;

-- analise_id passa a ser opcional (porta de entrada)
CREATE OR REPLACE FUNCTION public.movimento_beneficiarios_validar_analise_pessoa()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_pessoa_id bigint;
BEGIN
  IF NEW.analise_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pessoa_id INTO v_pessoa_id
  FROM public.movimento_analises_socioeconomicas
  WHERE id = NEW.analise_id;

  IF v_pessoa_id IS NULL THEN
    RAISE EXCEPTION 'Analise socioeconomica nao encontrada: %', NEW.analise_id;
  END IF;

  IF v_pessoa_id <> NEW.pessoa_id THEN
    RAISE EXCEPTION 'Analise (%) nao pertence a pessoa_id (%). Pertence a (%).',
      NEW.analise_id, NEW.pessoa_id, v_pessoa_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
