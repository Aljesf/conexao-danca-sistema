-- A5: Função SQL para reprocessar multa e juros em faturas em atraso.
-- Pode ser chamada diretamente pelo Codex sem autenticação de sessão.
--
-- Multa: 2% sobre valor_total_centavos (aplicada uma vez)
-- Juros: 0,0333% ao dia sobre valor_total_centavos
--
-- Uso:
--   SELECT * FROM reprocessar_taxas_faturas_atraso(ARRAY[123, 239, 253, 329, 389]);
--   SELECT * FROM reprocessar_taxas_faturas_atraso(NULL); -- todas EM_ATRASO

create or replace function public.reprocessar_taxas_faturas_atraso(
  p_fatura_ids integer[] default null
)
returns table (
  fatura_id integer,
  valor_total integer,
  dias_atraso integer,
  multa integer,
  juros integer,
  valor_taxas integer
)
language plpgsql
as $$
declare
  r record;
  v_dias integer;
  v_multa integer;
  v_juros integer;
  v_taxas integer;
  v_multa_perc numeric;
  v_juros_dia_perc numeric;
begin
  -- Buscar configuração de multa e juros para ALUNO (padrão)
  select
    coalesce(c.multa_percentual, 2) as multa_pct,
    coalesce(c.juros_dia_percentual, 0.0333) as juros_dia_pct
  into v_multa_perc, v_juros_dia_perc
  from public.credito_conexao_configuracoes c
  where c.tipo_conta = 'ALUNO'
  limit 1;

  -- Fallback se config não existir
  if v_multa_perc is null then
    v_multa_perc := 2;
  end if;
  if v_juros_dia_perc is null then
    v_juros_dia_perc := 0.0333;
  end if;

  for r in
    select
      f.id,
      f.valor_total_centavos,
      f.data_vencimento,
      f.status
    from public.credito_conexao_faturas f
    where f.status = 'EM_ATRASO'
      and f.data_vencimento is not null
      and f.valor_total_centavos > 0
      and (p_fatura_ids is null or f.id = any(p_fatura_ids))
    order by f.id
  loop
    v_dias := greatest(0, current_date - r.data_vencimento::date);

    if v_dias <= 0 then
      continue;
    end if;

    v_multa := round(r.valor_total_centavos * v_multa_perc / 100.0)::integer;
    v_juros := round(r.valor_total_centavos * v_juros_dia_perc / 100.0 * v_dias)::integer;
    v_taxas := v_multa + v_juros;

    update public.credito_conexao_faturas
    set valor_taxas_centavos = v_taxas,
        updated_at = now()
    where id = r.id;

    fatura_id := r.id;
    valor_total := r.valor_total_centavos;
    dias_atraso := v_dias;
    multa := v_multa;
    juros := v_juros;
    valor_taxas := v_taxas;
    return next;
  end loop;
end;
$$;

comment on function public.reprocessar_taxas_faturas_atraso(integer[]) is
  'Calcula e aplica multa (2%) e juros (0,0333%/dia) em faturas EM_ATRASO. Retorna detalhamento para auditoria.';
