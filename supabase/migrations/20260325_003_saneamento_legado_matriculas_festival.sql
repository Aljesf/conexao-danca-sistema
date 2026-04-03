-- Saneamento controlado: matriculas legadas, residuos de festival e dashboard financeiro
-- Data de referencia: 2026-03-25
-- Escopo deliberadamente restrito a IDs concretos diagnosticados.
--
-- Blocos cobertos:
-- 1) remocao completa da matricula #29 (Lylou/Lilu), preservando a matricula valida #49
-- 2) remocao de residuos artificiais do festival:
--    - inscricao quebrada de Maria Cecilia Lujan Falcao
--    - cobrancas orfas de Maria Cecilia e Evelin
--    - batch tecnico "Teste tecnico inscricoes 20260322015500"
-- 3) limpeza de residuos financeiros exclusivos que inflavam dashboard e reprocessamentos

begin;

-- =========================================================
-- 1. Garantias de seguranca para a matricula #29
-- =========================================================
do $$
declare
  v_pessoa_id bigint;
begin
  select pessoa_id
    into v_pessoa_id
  from public.matriculas
  where id = 29;

  if v_pessoa_id is null then
    raise notice 'Matricula #29 ja nao existe. Pulando bloco de saneamento da matricula.';
    return;
  end if;

  if not exists (
    select 1
    from public.matriculas
    where id = 49
      and pessoa_id = v_pessoa_id
      and status = 'ATIVA'
  ) then
    raise exception
      'Abortado: nao foi encontrada a matricula valida #49 ATIVA para a mesma pessoa da matricula #29.';
  end if;
end
$$;

create temp table tmp_saneamento_matricula29_cobrancas
on commit drop
as
select c.id
from public.cobrancas c
where c.origem_id = 29
   or c.origem_item_id = 29;

create temp table tmp_saneamento_matricula29_lancamentos
on commit drop
as
select l.id
from public.credito_conexao_lancamentos l
where l.matricula_id = 29
   or l.origem_id = 29;

-- Remove vinculos de fatura antes de apagar lancamentos.
delete from public.credito_conexao_fatura_lancamentos
where lancamento_id in (
  select id from tmp_saneamento_matricula29_lancamentos
);

-- Remove historico restritivo de cobranca, se houver.
delete from public.cobrancas_historico_eventos
where cobranca_id in (
  select id from tmp_saneamento_matricula29_cobrancas
);

-- Evita apontadores residuais para cobrancas removidas.
update public.matriculas
set primeira_cobranca_cobranca_id = null
where primeira_cobranca_cobranca_id in (
  select id from tmp_saneamento_matricula29_cobrancas
);

-- Dependencias operacionais exclusivas da matricula #29.
delete from public.matriculas_encerramentos
where matricula_id = 29;

delete from public.turma_aluno
where matricula_id = 29;

delete from public.matricula_execucao_valores
where matricula_id = 29;

delete from public.matriculas_itens
where matricula_id = 29;

delete from public.matricula_itens
where matricula_id = 29;

-- Reflexos financeiros exclusivos da matricula #29.
delete from public.credito_conexao_lancamentos
where id in (
  select id from tmp_saneamento_matricula29_lancamentos
);

delete from public.cobrancas
where id in (
  select id from tmp_saneamento_matricula29_cobrancas
);

-- Por fim, remove a matricula.
delete from public.matriculas
where id = 29;

-- =========================================================
-- 2. Batch artificial do festival e residuos orfaos
-- =========================================================
-- IDs concretos diagnosticados em 2026-03-25:
-- - Inscricao quebrada: af1ca735-5a9f-4df8-ab87-ea184896c490 (Maria Cecilia Lujan Falcao)
-- - Cobrancas orfas: 462, 468, 486, 505, 515, 516
-- - Lancamentos tecnicos: 456, 466, 467, 470, 471

create temp table tmp_saneamento_festival_inscricoes
on commit drop
as
select 'af1ca735-5a9f-4df8-ab87-ea184896c490'::uuid as id;

create temp table tmp_saneamento_festival_cobrancas
on commit drop
as
select unnest(array[462, 468, 486, 505, 515, 516]::bigint[]) as id;

create temp table tmp_saneamento_festival_lancamentos
on commit drop
as
select unnest(array[456, 466, 467, 470, 471]::bigint[]) as id;

-- Remove pivots de fatura dos lancamentos tecnicos.
delete from public.credito_conexao_fatura_lancamentos
where lancamento_id in (
  select id from tmp_saneamento_festival_lancamentos
);

-- Remove referencias financeiras explicitas, se existirem.
delete from public.eventos_escola_financeiro_referencias
where cobranca_id in (
    select id from tmp_saneamento_festival_cobrancas
  )
   or recebimento_id in (
    select r.id
    from public.recebimentos r
    where r.cobranca_id in (select id from tmp_saneamento_festival_cobrancas)
  )
   or descricao ilike 'Teste tecnico inscricoes 20260322015500%';

-- Remove residuos de elenco/participacao vinculados a inscricao quebrada.
delete from public.eventos_escola_coreografia_participantes
where inscricao_id in (
  select id from tmp_saneamento_festival_inscricoes
);

delete from public.eventos_escola_edicao_coreografia_elenco
where inscricao_id in (
  select id from tmp_saneamento_festival_inscricoes
);

-- Remove a inscricao quebrada; itens/movimentos/parcelas caem por cascade.
delete from public.eventos_escola_inscricoes
where id in (
  select id from tmp_saneamento_festival_inscricoes
);

-- Remove lancamentos tecnicos artificiais.
delete from public.credito_conexao_lancamentos
where id in (
  select id from tmp_saneamento_festival_lancamentos
);

-- Remove cobrancas orfas artificiais.
delete from public.cobrancas_historico_eventos
where cobranca_id in (
  select id from tmp_saneamento_festival_cobrancas
);

delete from public.cobrancas
where id in (
  select id from tmp_saneamento_festival_cobrancas
);

commit;

-- Consultas de verificacao manual apos aplicar:
-- select id, pessoa_id, status from public.matriculas where id in (29,49);
-- select id, descricao, status from public.cobrancas where id in (246,247,248,249,250,251,252,253,254,255,256,257,258,462,468,486,505,515,516);
-- select id, descricao, status from public.credito_conexao_lancamentos where id in (225,226,227,228,229,230,231,232,233,234,235,236,456,466,467,470,471);
-- select * from public.vw_financeiro_cobrancas_operacionais where origem_tipo = 'MATRICULA' and origem_id = 29;
-- select id, participante_nome_snapshot, status_inscricao, financeiro_status from public.eventos_escola_inscricoes where id = 'af1ca735-5a9f-4df8-ab87-ea184896c490'::uuid;
