-- Unificacao controlada dos 10 casos remanescentes de duplicidade de
-- matricula ATIVA em 2026-03-25.
--
-- Regras aplicadas:
-- - manter a matricula mais antiga como ancora/principal;
-- - incorporar os matricula_itens da matricula secundaria na principal;
-- - reatribuir vinculos operacionais e referencias financeiras quando o
--   vinculo e seguro e inequivoco;
-- - manter a matricula secundaria como registro historico CANCELADO;
-- - registrar observacoes tecnicas rastreaveis na principal, nos itens
--   migrados, nas cobrancas reatribuiveis e na secundaria consolidada.

create or replace function pg_temp.append_note(existing_note text, new_note text)
returns text
language sql
as $$
  select
    case
      when new_note is null or btrim(new_note) = '' then existing_note
      when existing_note is null or btrim(existing_note) = '' then new_note
      when existing_note like ('%' || new_note || '%') then existing_note
      else existing_note || E'\n' || new_note
    end
$$;

create or replace function pg_temp.unificar_matricula_par(
  p_pessoa_id bigint,
  p_matricula_principal bigint,
  p_matricula_secundaria bigint,
  p_nome text
)
returns void
language plpgsql
as $$
declare
  v_obs_principal text;
  v_obs_secundaria text;
  v_obs_item text;
  v_obs_cobranca text;
  v_obs_lancamento text;
  v_sec_item_ids bigint[];
  v_sec_item_unico bigint;
begin
  if not exists (
    select 1
    from public.matriculas
    where id = p_matricula_principal
      and pessoa_id = p_pessoa_id
  ) then
    raise exception 'Matricula principal % invalida para pessoa % (%).',
      p_matricula_principal, p_pessoa_id, p_nome;
  end if;

  if not exists (
    select 1
    from public.matriculas
    where id = p_matricula_secundaria
      and pessoa_id = p_pessoa_id
  ) then
    raise exception 'Matricula secundaria % invalida para pessoa % (%).',
      p_matricula_secundaria, p_pessoa_id, p_nome;
  end if;

  v_obs_principal := format(
    'Unificacao executada em 2026-03-25. Matricula origem %s incorporada na matricula destino %s.',
    p_matricula_secundaria,
    p_matricula_principal
  );
  v_obs_secundaria := format(
    'Unificacao executada em 2026-03-25. Matricula consolidada na matricula destino %s.',
    p_matricula_principal
  );
  v_obs_item := format(
    'Unificacao executada em 2026-03-25. Item migrado da matricula origem %s para a matricula destino %s.',
    p_matricula_secundaria,
    p_matricula_principal
  );
  v_obs_cobranca := format(
    'Unificacao executada em 2026-03-25. Origem da matricula %s consolidada na matricula %s.',
    p_matricula_secundaria,
    p_matricula_principal
  );
  v_obs_lancamento := format(
    'Unificacao executada em 2026-03-25. Matricula %s consolidada na matricula %s.',
    p_matricula_secundaria,
    p_matricula_principal
  );

  select coalesce(array_agg(mi.id order by mi.id), '{}'::bigint[])
    into v_sec_item_ids
  from public.matricula_itens mi
  where mi.matricula_id = p_matricula_secundaria;

  if coalesce(array_length(v_sec_item_ids, 1), 0) = 1 then
    v_sec_item_unico := v_sec_item_ids[1];
  else
    v_sec_item_unico := null;
  end if;

  if v_sec_item_unico is not null then
    update public.turma_aluno
       set matricula_item_id = v_sec_item_unico
     where matricula_id = p_matricula_secundaria
       and matricula_item_id is null;
  end if;

  update public.matricula_itens
     set matricula_id = p_matricula_principal,
         observacoes = pg_temp.append_note(observacoes, v_obs_item),
         updated_at = now()
   where matricula_id = p_matricula_secundaria;

  update public.turma_aluno
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria
      or (
        coalesce(array_length(v_sec_item_ids, 1), 0) > 0
        and matricula_item_id = any(v_sec_item_ids)
        and matricula_id <> p_matricula_principal
      );

  update public.cobrancas
     set origem_id = p_matricula_principal,
         observacoes = pg_temp.append_note(observacoes, v_obs_cobranca),
         updated_at = now()
   where origem_tipo = 'MATRICULA'
     and origem_id = p_matricula_secundaria;

  update public.credito_conexao_lancamentos
     set matricula_id = p_matricula_principal,
         descricao = descricao,
         updated_at = now()
   where matricula_id = p_matricula_secundaria;

  update public.matriculas_financeiro_linhas
     set matricula_id = p_matricula_principal,
         updated_at = now()
   where matricula_id = p_matricula_secundaria;

  delete from public.matricula_execucao_valores sec
   using public.matricula_execucao_valores pri
   where sec.matricula_id = p_matricula_secundaria
     and pri.matricula_id = p_matricula_principal
     and coalesce(sec.turma_id, 0) = coalesce(pri.turma_id, 0)
     and coalesce(sec.nivel, '') = coalesce(pri.nivel, '')
     and coalesce(sec.valor_mensal_centavos, 0) = coalesce(pri.valor_mensal_centavos, 0)
     and coalesce(sec.ativo, false) = coalesce(pri.ativo, false);

  update public.matricula_execucao_valores
     set matricula_id = p_matricula_principal,
         updated_at = now()
   where matricula_id = p_matricula_secundaria;

  update public.matriculas_itens
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria;

  update public.matriculas_encerramentos
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria;

  update public.matricula_eventos
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria;

  update public.contratos_emitidos
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria;

  update public.documentos_emitidos
     set matricula_id = p_matricula_principal
   where matricula_id = p_matricula_secundaria;

  update public.matriculas
     set total_mensalidade_centavos = coalesce((
           select sum(mi.valor_liquido_centavos)
           from public.matricula_itens mi
           where mi.matricula_id = p_matricula_principal
             and mi.status = 'ATIVO'
         ), total_mensalidade_centavos),
         observacoes = pg_temp.append_note(observacoes, v_obs_principal),
         updated_at = now()
   where id = p_matricula_principal;

  update public.matriculas
     set status = 'CANCELADA',
         data_encerramento = coalesce(data_encerramento, date '2026-03-25'),
         cancelamento_tipo = coalesce(cancelamento_tipo, 'AJUSTE_SISTEMA'),
         encerramento_tipo = coalesce(encerramento_tipo, 'CANCELADA'),
         encerramento_motivo = coalesce(
           encerramento_motivo,
           format('Matricula consolidada na matricula %s em 2026-03-25.', p_matricula_principal)
         ),
         encerramento_em = coalesce(encerramento_em, now()),
         observacoes = pg_temp.append_note(observacoes, v_obs_secundaria),
         updated_at = now()
   where id = p_matricula_secundaria;
end;
$$;

-- Caso 1: Ana Beatriz Lima do Nascimento
select pg_temp.unificar_matricula_par(56, 2, 103, 'Ana Beatriz Lima do Nascimento');

-- Caso 2: Anna Alissa Demetrio Cruz Fonseca
select pg_temp.unificar_matricula_par(76, 13, 31, 'Anna Alissa Demetrio Cruz Fonseca');

-- Caso 3: Cibele Beatriz do Nascimento Costa
select pg_temp.unificar_matricula_par(195, 25, 50, 'Cibele Beatriz do Nascimento Costa');

-- Caso 4: Emily Marcelly Monteiro da Silva
select pg_temp.unificar_matricula_par(159, 101, 119, 'Emily Marcelly Monteiro da Silva');

-- Caso 5: Evelin do Santos Costa
select pg_temp.unificar_matricula_par(72, 46, 113, 'Evelin do Santos Costa');

-- Caso 6: Fernanda Gabriella Figueiredo da Silva
select pg_temp.unificar_matricula_par(105, 30, 67, 'Fernanda Gabriella Figueiredo da Silva');

-- Caso 7: Lara Macapuna Nascimento
select pg_temp.unificar_matricula_par(140, 19, 104, 'Lara Macapuna Nascimento');

-- Caso 8: Lunna Moura Monteiro
select pg_temp.unificar_matricula_par(157, 24, 56, 'Lunna Moura Monteiro');

-- Caso 9: Maite Braga de Andrade Santana
select pg_temp.unificar_matricula_par(99, 22, 88, 'Maite Braga de Andrade Santana');

-- Caso 10: Vanessa Gomes dos Santos
select pg_temp.unificar_matricula_par(184, 81, 106, 'Vanessa Gomes dos Santos');

drop function if exists pg_temp.unificar_matricula_par(bigint, bigint, bigint, text);
drop function if exists pg_temp.append_note(text, text);
