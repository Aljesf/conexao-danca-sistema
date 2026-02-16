-- adiciona preferencia de dia de vencimento da conta (Cartao Conexao)
alter table public.credito_conexao_contas
  add column if not exists dia_vencimento_preferido smallint null;

-- 1..28 (evita meses curtos quebrando o ciclo)
alter table public.credito_conexao_contas
  drop constraint if exists credito_conexao_contas_dia_vencimento_preferido_chk;

alter table public.credito_conexao_contas
  add constraint credito_conexao_contas_dia_vencimento_preferido_chk
  check (
    dia_vencimento_preferido is null
    or (dia_vencimento_preferido >= 1 and dia_vencimento_preferido <= 28)
  );

comment on column public.credito_conexao_contas.dia_vencimento_preferido
  is 'Dia preferido (1..28) para vencimento das cobrancas/fechamento de fatura do Cartao Conexao.';
