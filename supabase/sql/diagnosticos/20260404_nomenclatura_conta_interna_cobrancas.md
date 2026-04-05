# Diagnostico - nomenclatura de conta interna em cobrancas canonicas

Data: 2026-04-04

## Resumo

- padrao antigo encontrado nas cobrancas canonicas: `Mensalidade Conexao Danca - {periodo} - Fatura #{id}`
- total de cobrancas canonicas afetadas: `87`
- total de cobrancas canonicas ativas afetadas antes da correcao: `73`
- total de lancamentos com nomenclatura antiga: `0`
- `credito_conexao_faturas` nao possui campo textual descritivo para saneamento de nomenclatura

## Codigo

Gerador central identificado:

- `src/lib/financeiro/cobranca/descricao.ts`

Call sites relevantes:

- `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`
- `src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts`

Observacao NeoFin:

- `src/lib/financeiro/cobranca/providers/neofinProvider.ts` envia `input.descricao` para o campo `description` do billing
- portanto, a alteracao do builder passa a alimentar a NeoFin nas novas cobrancas e nos fluxos que recriam/upsertam o billing
- nao foi feito backfill remoto de descricoes ja emitidas na NeoFin nesta tarefa

## Resultado final

- cobrancas canonicas ativas com nomenclatura antiga: `0`
- cobrancas canonicas totais com nomenclatura antiga: `0`
