-- Objetivos:
-- 1) impedir duplicidade de geracao financeira
-- 2) reforcar idempotencia da conta interna
-- 3) permitir reconciliacao consistente entre cobranca, lancamento e fatura

create table if not exists public.financeiro_conta_interna_reconciliacao_log (
  id bigserial primary key,
  tipo text not null,
  conta_conexao_id bigint,
  competencia text,
  fatura_id bigint,
  cobranca_id bigint,
  lancamento_id bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_reconciliacao_log_conta_competencia
  on public.financeiro_conta_interna_reconciliacao_log (conta_conexao_id, competencia, created_at desc);

create index if not exists idx_credito_conexao_lancamentos_cobranca_status
  on public.credito_conexao_lancamentos (cobranca_id, status)
  where cobranca_id is not null;

create index if not exists idx_credito_conexao_lancamentos_conta_comp_ref_status
  on public.credito_conexao_lancamentos (conta_conexao_id, competencia, referencia_item, status)
  where referencia_item is not null;

create index if not exists idx_cobrancas_conta_interna_competencia_origem_item
  on public.cobrancas (
    conta_interna_id,
    competencia_ano_mes,
    origem_item_tipo,
    origem_item_id,
    coalesce(origem_subtipo, '')
  )
  where conta_interna_id is not null
    and competencia_ano_mes is not null
    and origem_item_tipo is not null
    and origem_item_id is not null;

create or replace function public.fn_guardar_credito_conexao_lancamento_idempotente()
returns trigger
language plpgsql
as $$
begin
  if upper(coalesce(new.status, '')) in ('PENDENTE_FATURA', 'FATURADO') then
    if new.cobranca_id is not null then
      if exists (
        select 1
        from public.credito_conexao_lancamentos l
        where l.cobranca_id = new.cobranca_id
          and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
          and l.id <> coalesce(new.id, -1)
      ) then
        raise exception using
          errcode = '23505',
          message = format('Ja existe lancamento ativo para a cobranca %s.', new.cobranca_id);
      end if;
    end if;

    if new.conta_conexao_id is not null
       and new.competencia is not null
       and new.referencia_item is not null then
      if exists (
        select 1
        from public.credito_conexao_lancamentos l
        where l.conta_conexao_id = new.conta_conexao_id
          and l.competencia = new.competencia
          and l.referencia_item = new.referencia_item
          and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
          and l.id <> coalesce(new.id, -1)
      ) then
        raise exception using
          errcode = '23505',
          message = format(
            'Ja existe lancamento ativo para a conta %s na competencia %s com referencia %s.',
            new.conta_conexao_id,
            new.competencia,
            new.referencia_item
          );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guardar_credito_conexao_lancamento_idempotente on public.credito_conexao_lancamentos;

create trigger trg_guardar_credito_conexao_lancamento_idempotente
before insert or update of cobranca_id, conta_conexao_id, competencia, referencia_item, status
on public.credito_conexao_lancamentos
for each row
execute function public.fn_guardar_credito_conexao_lancamento_idempotente();

create or replace function public.fn_guardar_cobranca_conta_interna_idempotente()
returns trigger
language plpgsql
as $$
begin
  if upper(coalesce(new.status, '')) not in ('CANCELADA', 'CANCELADO')
     and new.conta_interna_id is not null
     and new.competencia_ano_mes is not null
     and new.origem_item_tipo is not null
     and new.origem_item_id is not null then
    if exists (
      select 1
      from public.cobrancas c
      where c.conta_interna_id = new.conta_interna_id
        and c.competencia_ano_mes = new.competencia_ano_mes
        and c.origem_item_tipo = new.origem_item_tipo
        and c.origem_item_id = new.origem_item_id
        and coalesce(c.origem_subtipo, '') = coalesce(new.origem_subtipo, '')
        and upper(coalesce(c.status, '')) not in ('CANCELADA', 'CANCELADO')
        and c.id <> coalesce(new.id, -1)
    ) then
      raise exception using
        errcode = '23505',
        message = format(
          'Ja existe cobranca ativa para conta_interna %s, competencia %s, origem_item %s/%s e subtipo %s.',
          new.conta_interna_id,
          new.competencia_ano_mes,
          new.origem_item_tipo,
          new.origem_item_id,
          coalesce(new.origem_subtipo, '(sem subtipo)')
        );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guardar_cobranca_conta_interna_idempotente on public.cobrancas;

create trigger trg_guardar_cobranca_conta_interna_idempotente
before insert or update of conta_interna_id, competencia_ano_mes, origem_item_tipo, origem_item_id, origem_subtipo, status
on public.cobrancas
for each row
execute function public.fn_guardar_cobranca_conta_interna_idempotente();

create or replace function public.fn_credito_conexao_resolver_vencimento_competencia(
  p_conta_conexao_id bigint,
  p_competencia text
)
returns date
language plpgsql
as $$
declare
  v_ano integer;
  v_mes integer;
  v_dia integer;
  v_ultimo_dia integer;
begin
  if p_competencia is null or p_competencia !~ '^\d{4}-\d{2}$' then
    return null;
  end if;

  v_ano := split_part(p_competencia, '-', 1)::integer;
  v_mes := split_part(p_competencia, '-', 2)::integer;

  select coalesce(c.dia_vencimento_preferido, c.dia_vencimento, 12)
    into v_dia
  from public.credito_conexao_contas c
  where c.id = p_conta_conexao_id;

  v_dia := greatest(coalesce(v_dia, 12), 1);
  v_ultimo_dia := extract(day from (date_trunc('month', make_date(v_ano, v_mes, 1)) + interval '1 month - 1 day'))::integer;

  return make_date(v_ano, v_mes, least(v_dia, v_ultimo_dia));
end;
$$;

create or replace function public.fn_credito_conexao_rebuild_fatura_por_competencia(
  p_conta_conexao_id bigint,
  p_competencia text
)
returns table (
  fatura_id bigint,
  valor_total_centavos integer,
  status text,
  cobranca_id bigint,
  quantidade_lancamentos integer
)
language plpgsql
as $$
declare
  v_fatura_id bigint;
  v_status_atual text;
  v_status_final text;
  v_cobranca_id bigint;
  v_total integer := 0;
  v_qtd integer := 0;
  v_qtd_cobrancas integer := 0;
  v_todas_quitadas boolean := false;
  v_data_vencimento date;
  v_data_fechamento date;
begin
  if p_competencia is null or p_competencia !~ '^\d{4}-\d{2}$' then
    raise exception using
      errcode = '22007',
      message = format('Competencia invalida: %s', coalesce(p_competencia, '(null)'));
  end if;

  v_data_vencimento := public.fn_credito_conexao_resolver_vencimento_competencia(p_conta_conexao_id, p_competencia);
  v_data_fechamento := (date_trunc('month', make_date(split_part(p_competencia, '-', 1)::integer, split_part(p_competencia, '-', 2)::integer, 1)) + interval '1 month - 1 day')::date;

  select f.id, f.status
    into v_fatura_id, v_status_atual
  from public.credito_conexao_faturas f
  where f.conta_conexao_id = p_conta_conexao_id
    and f.periodo_referencia = p_competencia
  order by f.id
  limit 1;

  if v_fatura_id is null then
    if not exists (
      select 1
      from public.credito_conexao_lancamentos l
      where l.conta_conexao_id = p_conta_conexao_id
        and l.competencia = p_competencia
        and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    ) then
      return;
    end if;

    insert into public.credito_conexao_faturas (
      conta_conexao_id,
      periodo_referencia,
      data_fechamento,
      data_vencimento,
      valor_total_centavos,
      status,
      created_at,
      updated_at
    )
    values (
      p_conta_conexao_id,
      p_competencia,
      v_data_fechamento,
      v_data_vencimento,
      0,
      'ABERTA',
      now(),
      now()
    )
    returning id, status into v_fatura_id, v_status_atual;
  end if;

  delete from public.credito_conexao_fatura_lancamentos fl
  where fl.fatura_id = v_fatura_id
    and not exists (
      select 1
      from public.credito_conexao_lancamentos l
      where l.id = fl.lancamento_id
        and l.conta_conexao_id = p_conta_conexao_id
        and l.competencia = p_competencia
        and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    );

  insert into public.credito_conexao_fatura_lancamentos (fatura_id, lancamento_id, created_at)
  select
    v_fatura_id,
    l.id,
    now()
  from public.credito_conexao_lancamentos l
  left join public.credito_conexao_fatura_lancamentos fl
    on fl.fatura_id = v_fatura_id
   and fl.lancamento_id = l.id
  where l.conta_conexao_id = p_conta_conexao_id
    and l.competencia = p_competencia
    and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    and fl.lancamento_id is null;

  select
    coalesce(sum(l.valor_centavos), 0),
    count(*)
    into v_total, v_qtd
  from public.credito_conexao_lancamentos l
  where l.conta_conexao_id = p_conta_conexao_id
    and l.competencia = p_competencia
    and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO');

  select
    count(distinct l.cobranca_id),
    min(l.cobranca_id)
    into v_qtd_cobrancas, v_cobranca_id
  from public.credito_conexao_lancamentos l
  where l.conta_conexao_id = p_conta_conexao_id
    and l.competencia = p_competencia
    and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    and l.cobranca_id is not null;

  if coalesce(v_qtd_cobrancas, 0) <> 1 then
    v_cobranca_id := null;
  end if;

  select bool_and(upper(coalesce(c.status, '')) in ('PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA'))
    into v_todas_quitadas
  from public.cobrancas c
  join (
    select distinct l.cobranca_id
    from public.credito_conexao_lancamentos l
    where l.conta_conexao_id = p_conta_conexao_id
      and l.competencia = p_competencia
      and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
      and l.cobranca_id is not null
  ) cobrancas_validas
    on cobrancas_validas.cobranca_id = c.id;

  if upper(coalesce(v_status_atual, '')) = 'CANCELADA' then
    v_status_final := 'CANCELADA';
  elsif v_qtd > 0 and coalesce(v_todas_quitadas, false) then
    v_status_final := 'PAGA';
  elsif v_total > 0 and coalesce(v_data_vencimento, current_date) < current_date then
    v_status_final := 'EM_ATRASO';
  else
    v_status_final := 'ABERTA';
  end if;

  update public.credito_conexao_faturas
     set valor_total_centavos = v_total,
         status = v_status_final,
         cobranca_id = v_cobranca_id,
         data_fechamento = coalesce(data_fechamento, v_data_fechamento),
         data_vencimento = coalesce(v_data_vencimento, data_vencimento),
         updated_at = now()
   where id = v_fatura_id;

  insert into public.financeiro_conta_interna_reconciliacao_log (
    tipo,
    conta_conexao_id,
    competencia,
    fatura_id,
    cobranca_id,
    payload
  )
  values (
    'REBUILD_FATURA',
    p_conta_conexao_id,
    p_competencia,
    v_fatura_id,
    v_cobranca_id,
    jsonb_build_object(
      'valor_total_centavos', v_total,
      'status_final', v_status_final,
      'quantidade_lancamentos', v_qtd,
      'todas_quitadas', coalesce(v_todas_quitadas, false)
    )
  );

  return query
  select v_fatura_id, v_total, v_status_final, v_cobranca_id, v_qtd;
end;
$$;

do $$
declare
  v_conta_conexao_id bigint := 41;
  v_competencia text := '2026-03';
  v_fatura_id bigint := 364;
  v_cobranca_canonica_id bigint := 445;
  v_cobranca_duplicada_id bigint := 455;
  v_matricula_id bigint := 122;
  v_referencia_canonica text := 'matricula:122|competencia:2026-03|natureza:conta_interna_mensalidade';
  v_lancamento_canonico_id bigint;
  v_lancamento_duplicado_id bigint;
  v_recebimento_duplicado_id bigint;
begin
  insert into public.financeiro_conta_interna_reconciliacao_log (
    tipo,
    conta_conexao_id,
    competencia,
    fatura_id,
    cobranca_id,
    payload
  )
  values (
    'SANEAMENTO_CASO_BASE_INICIO',
    v_conta_conexao_id,
    v_competencia,
    v_fatura_id,
    v_cobranca_canonica_id,
    jsonb_build_object(
      'matricula_id', v_matricula_id,
      'referencia_canonica', v_referencia_canonica
    )
  );

  update public.cobrancas
     set conta_interna_id = coalesce(conta_interna_id, v_conta_conexao_id),
         competencia_ano_mes = coalesce(competencia_ano_mes, v_competencia),
         origem_agrupador_tipo = coalesce(origem_agrupador_tipo, 'CONTA_INTERNA'),
         origem_agrupador_id = coalesce(origem_agrupador_id, v_conta_conexao_id),
         origem_item_tipo = coalesce(origem_item_tipo, 'MATRICULA'),
         origem_item_id = coalesce(origem_item_id, v_matricula_id),
         origem_subtipo = coalesce(origem_subtipo, 'CONTA_INTERNA_MENSALIDADE'),
         origem_label = coalesce(origem_label, descricao),
         updated_at = now()
   where id = v_cobranca_canonica_id;

  select l.id
    into v_lancamento_canonico_id
  from public.credito_conexao_lancamentos l
  where l.conta_conexao_id = v_conta_conexao_id
    and l.competencia = v_competencia
    and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    and l.cobranca_id = v_cobranca_canonica_id
  order by l.created_at desc nulls last, l.id desc
  limit 1;

  if v_lancamento_canonico_id is null then
    select l.id
      into v_lancamento_canonico_id
    from public.credito_conexao_lancamentos l
    where l.conta_conexao_id = v_conta_conexao_id
      and l.competencia = v_competencia
      and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
      and (
        l.matricula_id = v_matricula_id
        or (upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' and l.origem_id = v_matricula_id)
      )
    order by
      case when l.referencia_item = v_referencia_canonica then 0 else 1 end,
      case when l.cobranca_id is not null then 0 else 1 end,
      l.created_at desc nulls last,
      l.id desc
    limit 1;
  end if;

  select l.id
    into v_lancamento_duplicado_id
  from public.credito_conexao_lancamentos l
  where l.conta_conexao_id = v_conta_conexao_id
    and l.competencia = v_competencia
    and upper(coalesce(l.status, '')) in ('PENDENTE_FATURA', 'FATURADO')
    and l.id <> coalesce(v_lancamento_canonico_id, -1)
    and (
      l.matricula_id = v_matricula_id
      or (upper(coalesce(l.origem_sistema, '')) like 'MATRICULA%' and l.origem_id = v_matricula_id)
      or l.cobranca_id = v_cobranca_duplicada_id
      or l.referencia_item in (
        'matricula:122|cartao_conexao|competencia:2026-03',
        v_referencia_canonica
      )
    )
  order by
    case when l.cobranca_id is null then 0 else 1 end,
    l.created_at asc nulls first,
    l.id asc
  limit 1;

  update public.cobrancas
     set status = 'CANCELADA',
         cancelada_em = coalesce(cancelada_em, now()),
         cancelada_motivo = coalesce(cancelada_motivo, 'Duplicidade saneada na conta interna da matricula 122 / competencia 2026-03'),
         cancelamento_motivo = coalesce(cancelamento_motivo, 'Duplicidade saneada na conta interna da matricula 122 / competencia 2026-03'),
         cancelamento_tipo = coalesce(cancelamento_tipo, 'MIGRACAO_CONTA_INTERNA'),
         expurgada = true,
         expurgada_em = coalesce(expurgada_em, now()),
         expurgo_motivo = coalesce(expurgo_motivo, 'Cobranca duplicada de entrada de reprocessamento para a mensalidade canonica de 2026-03'),
         migracao_conta_interna_status = coalesce(migracao_conta_interna_status, 'DUPLICIDADE_CANCELADA'),
         migracao_conta_interna_observacao = coalesce(
           migracao_conta_interna_observacao,
           'Duplicidade da cobranca 455 saneada; cobranca canonica preservada: 445.'
         ),
         updated_at = now()
   where id = v_cobranca_duplicada_id;

  select r.id
    into v_recebimento_duplicado_id
  from public.recebimentos r
  where r.cobranca_id = v_cobranca_duplicada_id
  order by r.id desc
  limit 1;

  if v_recebimento_duplicado_id is not null then
    update public.recebimentos
       set observacoes = trim(
         both ' |' from concat_ws(
           ' | ',
           nullif(observacoes, ''),
           'Recebimento preservado apenas para auditoria; vinculado a cobranca duplicada #455 saneada pela migration 20260323_fix_conta_interna_duplicidade_dashboards.'
         )
       )
     where id = v_recebimento_duplicado_id;
  end if;

  if v_lancamento_duplicado_id is not null then
    delete from public.credito_conexao_fatura_lancamentos
    where lancamento_id = v_lancamento_duplicado_id;

    update public.credito_conexao_lancamentos
       set status = 'CANCELADO',
           updated_at = now(),
           composicao_json = coalesce(composicao_json, '{}'::jsonb)
             || jsonb_build_object(
               'cancelado_por_migration', '20260323_fix_conta_interna_duplicidade_dashboards',
               'motivo', 'duplicidade_conta_interna_matricula_122_competencia_2026_03'
             )
     where id = v_lancamento_duplicado_id;
  end if;

  if v_lancamento_canonico_id is not null then
    update public.credito_conexao_lancamentos
       set cobranca_id = v_cobranca_canonica_id,
           referencia_item = v_referencia_canonica,
           status = case when upper(coalesce(status, '')) = 'CANCELADO' then 'PENDENTE_FATURA' else status end,
           updated_at = now(),
           composicao_json = coalesce(composicao_json, '{}'::jsonb)
             || jsonb_build_object(
               'conta_interna_business_key', v_referencia_canonica,
               'cobranca_id_canonica', v_cobranca_canonica_id,
               'saneado_por_migration', '20260323_fix_conta_interna_duplicidade_dashboards'
             )
     where id = v_lancamento_canonico_id;

    insert into public.credito_conexao_fatura_lancamentos (fatura_id, lancamento_id, created_at)
    select v_fatura_id, v_lancamento_canonico_id, now()
    where not exists (
      select 1
      from public.credito_conexao_fatura_lancamentos fl
      where fl.fatura_id = v_fatura_id
        and fl.lancamento_id = v_lancamento_canonico_id
    );
  end if;

  update public.credito_conexao_faturas
     set cobranca_id = v_cobranca_canonica_id,
         updated_at = now()
   where id = v_fatura_id;

  update public.matriculas
     set primeira_cobranca_cobranca_id = coalesce(primeira_cobranca_cobranca_id, v_cobranca_canonica_id),
         updated_at = now()
   where id = v_matricula_id;

  perform public.fn_credito_conexao_rebuild_fatura_por_competencia(v_conta_conexao_id, v_competencia);

  insert into public.financeiro_conta_interna_reconciliacao_log (
    tipo,
    conta_conexao_id,
    competencia,
    fatura_id,
    cobranca_id,
    lancamento_id,
    payload
  )
  values (
    'SANEAMENTO_CASO_BASE_FIM',
    v_conta_conexao_id,
    v_competencia,
    v_fatura_id,
    v_cobranca_canonica_id,
    v_lancamento_canonico_id,
    jsonb_build_object(
      'cobranca_duplicada_cancelada', v_cobranca_duplicada_id,
      'recebimento_duplicado_auditado', v_recebimento_duplicado_id,
      'lancamento_duplicado_cancelado', v_lancamento_duplicado_id,
      'referencia_canonica', v_referencia_canonica
    )
  );
end;
$$;
