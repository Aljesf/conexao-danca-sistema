-- Credito Conexao - Recalcular total de faturas automaticamente
-- - Cria funcao de recalculo
-- - Cria triggers para manter totals sempre corretos
-- - Reprocessa todas as faturas existentes (uma vez)

-- 1) Funcao: recalcula total de UMA fatura
create or replace function public.credito_conexao_recalcular_total_fatura(p_fatura_id bigint)
returns void
language plpgsql
as $$
declare
  v_total_lancamentos integer;
  v_taxas integer;
begin
  select coalesce(sum(l.valor_centavos), 0)
    into v_total_lancamentos
  from public.credito_conexao_fatura_lancamentos fl
  join public.credito_conexao_lancamentos l
    on l.id = fl.lancamento_id
  where fl.fatura_id = p_fatura_id;

  select coalesce(valor_taxas_centavos, 0)
    into v_taxas
  from public.credito_conexao_faturas
  where id = p_fatura_id;

  update public.credito_conexao_faturas
  set valor_total_centavos = v_total_lancamentos + v_taxas,
      updated_at = now()
  where id = p_fatura_id;
end $$;

-- 2) Trigger function: recalcula apos INSERT/DELETE no pivot
create or replace function public.trg_credito_conexao_recalcular_total_fatura_from_pivot()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.credito_conexao_recalcular_total_fatura(new.fatura_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.credito_conexao_recalcular_total_fatura(old.fatura_id);
    return old;
  end if;

  return null;
end $$;

-- 3) Triggers no pivot (sempre que vincular/desvincular lancamento)
drop trigger if exists trg_cc_fatura_total_pivot_ins on public.credito_conexao_fatura_lancamentos;
drop trigger if exists trg_cc_fatura_total_pivot_del on public.credito_conexao_fatura_lancamentos;

create trigger trg_cc_fatura_total_pivot_ins
after insert on public.credito_conexao_fatura_lancamentos
for each row
execute function public.trg_credito_conexao_recalcular_total_fatura_from_pivot();

create trigger trg_cc_fatura_total_pivot_del
after delete on public.credito_conexao_fatura_lancamentos
for each row
execute function public.trg_credito_conexao_recalcular_total_fatura_from_pivot();

-- 4) Trigger para quando o valor do lancamento mudar
create or replace function public.trg_credito_conexao_recalcular_total_fatura_from_lancamento()
returns trigger
language plpgsql
as $$
declare
  r record;
begin
  -- Recalcula todas as faturas onde este lancamento aparece
  for r in
    select distinct fl.fatura_id
    from public.credito_conexao_fatura_lancamentos fl
    where fl.lancamento_id = new.id
  loop
    perform public.credito_conexao_recalcular_total_fatura(r.fatura_id);
  end loop;

  return new;
end $$;

drop trigger if exists trg_cc_fatura_total_lanc_upd on public.credito_conexao_lancamentos;

create trigger trg_cc_fatura_total_lanc_upd
after update of valor_centavos on public.credito_conexao_lancamentos
for each row
when (old.valor_centavos is distinct from new.valor_centavos)
execute function public.trg_credito_conexao_recalcular_total_fatura_from_lancamento();

-- 5) Reprocessamento geral (rodar uma vez): recalcula TODAS as faturas existentes
do $$
declare
  r record;
begin
  for r in
    select id from public.credito_conexao_faturas order by id
  loop
    perform public.credito_conexao_recalcular_total_fatura(r.id);
  end loop;
end $$;

-- 6) Verificacao rapida (amostra)
select id, conta_conexao_id, periodo_referencia, valor_total_centavos, valor_taxas_centavos, status
from public.credito_conexao_faturas
order by id desc
limit 20;
