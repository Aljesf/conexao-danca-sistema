begin;

-- 1) Sequence para numeracao de codigos
create sequence if not exists public.loja_produtos_codigo_seq;

-- 2) Ajustar o valor inicial da sequence com base no maior numero encontrado nos codigos existentes EVID-XXXXXX-...
-- Extrai os 6 digitos apos "EVID-" e antes do proximo "-"
-- Se nao encontrar, comeca em 1
do $$
declare
  v_max int;
begin
  select max((regexp_match(codigo, '^EVID-(\d{6})-'))[1]::int)
    into v_max
  from public.loja_produtos
  where codigo is not null;

  if v_max is null then
    v_max := 0;
  end if;

  perform setval('public.loja_produtos_codigo_seq', v_max + 1, false);
end $$;

-- 3) Funcao slug simples (sem extensao)
create or replace function public.fn_slugify_simple(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(
      translate(
        coalesce(p_text,''),
        U&'\00C1\00C0\00C2\00C3\00C4\00C5\00E1\00E0\00E2\00E3\00E4\00E5\00C9\00C8\00CA\00CB\00E9\00E8\00EA\00EB\00CD\00CC\00CE\00CF\00ED\00EC\00EE\00EF\00D3\00D2\00D4\00D5\00D6\00F3\00F2\00F4\00F5\00F6\00DA\00D9\00DB\00DC\00FA\00F9\00FB\00FC\00C7\00E7\00D1\00F1',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

-- 4) Trigger para preencher codigo antes do insert
create or replace function public.trg_loja_produtos_fill_codigo()
returns trigger
language plpgsql
as $$
declare
  v_seq int;
  v_slug text;
  v_codigo text;
  v_try int := 0;
begin
  if new.codigo is not null and length(trim(new.codigo)) > 0 then
    return new;
  end if;

  v_slug := public.fn_slugify_simple(new.nome);

  -- tenta gerar um codigo unico (por seguranca)
  loop
    v_seq := nextval('public.loja_produtos_codigo_seq');
    v_codigo := 'EVID-' || lpad(v_seq::text, 6, '0') || '-' || upper(v_slug);

    exit when not exists (select 1 from public.loja_produtos p where p.codigo = v_codigo);

    v_try := v_try + 1;
    if v_try > 10 then
      raise exception 'Falha ao gerar codigo unico para produto (muitas colisoes).';
    end if;
  end loop;

  new.codigo := v_codigo;
  return new;
end $$;

drop trigger if exists loja_produtos_fill_codigo on public.loja_produtos;
create trigger loja_produtos_fill_codigo
before insert on public.loja_produtos
for each row
execute function public.trg_loja_produtos_fill_codigo();

commit;
