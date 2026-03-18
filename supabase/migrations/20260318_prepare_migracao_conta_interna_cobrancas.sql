begin;

alter table public.cobrancas
  add column if not exists origem_agrupador_tipo text,
  add column if not exists origem_agrupador_id bigint,
  add column if not exists origem_item_tipo text,
  add column if not exists origem_item_id bigint,
  add column if not exists conta_interna_id bigint,
  add column if not exists origem_label text,
  add column if not exists migracao_conta_interna_status text,
  add column if not exists migracao_conta_interna_observacao text;

create index if not exists idx_cobrancas_conta_interna_id
  on public.cobrancas (conta_interna_id)
  where conta_interna_id is not null;

create index if not exists idx_cobrancas_origem_agrupador
  on public.cobrancas (origem_agrupador_tipo, origem_agrupador_id);

create index if not exists idx_cobrancas_origem_item
  on public.cobrancas (origem_item_tipo, origem_item_id);

create index if not exists idx_cobrancas_migracao_conta_interna_status
  on public.cobrancas (migracao_conta_interna_status);

comment on column public.cobrancas.origem_agrupador_tipo is
'Contexto canônico pai da cobrança. Valores esperados: CONTA_INTERNA, FATURA, VENDA_DIRETA, AJUSTE e OUTRO.';

comment on column public.cobrancas.origem_agrupador_id is
'Identificador do agrupador canônico da cobrança: conta interna, fatura consolidada ou entidade equivalente.';

comment on column public.cobrancas.origem_item_tipo is
'Item canônico representado dentro do agrupador: MATRICULA, MENSALIDADE, CURSO, CAFE, LOJA, AJUSTE, PRO_RATA ou OUTRO.';

comment on column public.cobrancas.origem_item_id is
'Identificador do item canônico dentro do agrupador, preservando o vínculo legado quando existir.';

comment on column public.cobrancas.conta_interna_id is
'Conta interna (credito_conexao_contas.id) associada semanticamente à cobrança quando houver comprovação de vínculo.';

comment on column public.cobrancas.origem_label is
'Label humana prioritária para exibição da origem canônica da cobrança sem expor strings técnicas legadas.';

comment on column public.cobrancas.migracao_conta_interna_status is
'Status operacional da migração semântica: PENDENTE, MIGRADO, MANTER_DIRETO, AMBIGUO ou IGNORAR.';

comment on column public.cobrancas.migracao_conta_interna_observacao is
'Observação livre para registrar ambiguidade, bloqueio ou justificativa de manutenção fora da conta interna.';

commit;
