# Diagnostico tecnico - matricula orfa na Conta Interna

## Contexto do problema

Foi identificado um caso em que uma matricula de teste foi cancelada/excluida, mas permaneceram residuos financeiros de R$ 3,00 em faturas da Conta Interna do colaborador. Esses residuos continuavam aparecendo na importacao da folha e impactando o liquido da competencia.

## Fluxo atual encontrado

1. A geracao mensal de mensalidade em `src/app/api/credito-conexao/gerar-lancamentos-mensais/route.ts` criava ou atualizava a cobranca da matricula e fazia `upsert` do lancamento consolidado na Conta Interna.
2. Esse lancamento era gravado via `src/lib/credito-conexao/upsertLancamentoPorCobranca.ts`.
3. O fechamento/rebuild de fatura reaproveitava lancamentos ativos em `credito_conexao_lancamentos` e seus vinculos em `credito_conexao_fatura_lancamentos`.
4. A importacao da folha em `src/app/api/admin/folha/colaboradores/[id]/importar-faturas/route.ts` e `src/app/api/financeiro/folha/[folhaId]/importar-cartao-conexao/route.ts` consumia o valor total da fatura sem validar a integridade completa da cadeia de origem.

## Causa raiz exata

O problema nao estava em um unico ponto, e sim na combinacao abaixo:

1. A geracao mensal da Conta Interna gravava lancamentos com `origem_sistema = 'MATRICULA_MENSAL'`, mas sem reforcar sempre `matricula_id`, sem usar referencia canonica de negocio e sem bloquear matricula cancelada.
2. A rota de cancelamento da matricula em `src/app/api/matriculas/[id]/cancelar/route.ts` limpava apenas:
   - cobrancas futuras abertas ligadas por `origem_tipo = 'MATRICULA'`
   - lancamentos com origem direta `MATRICULA`
   - lancamentos ligados apenas ao subconjunto de cobrancas que ela tinha acabado de cancelar
3. Quando a cobranca da mensalidade ja estava vencida ou quando o lancamento foi criado com origem mensal indireta (`MATRICULA_MENSAL`), essa cadeia nao era encontrada pela limpeza.
4. O rebuild da fatura e a importacao em folha continuavam tratando o lancamento remanescente como valido, porque nao havia validacao forte da origem (matricula/cobranca/item cancelado, orfao ou expurgado).

Em termos praticos, o residuo ficou principalmente como:

- `cobrancas` orfas/nao canceladas apesar da matricula ja cancelada
- `credito_conexao_lancamentos` ativos derivados de matricula cancelada
- `credito_conexao_fatura_lancamentos` ainda vinculando o lancamento residual a fatura
- reflexo em `folha_pagamento_itens` e, no fluxo legado, em `folha_pagamento_eventos`

## Tabelas afetadas

- `matriculas`
- `matricula_itens`
- `turma_aluno`
- `cobrancas`
- `credito_conexao_lancamentos`
- `credito_conexao_faturas`
- `credito_conexao_fatura_lancamentos`
- `folha_pagamento`
- `folha_pagamento_itens`
- `folha_pagamento_colaborador`
- `folha_pagamento_eventos`

## APIs afetadas

- `src/app/api/credito-conexao/gerar-lancamentos-mensais/route.ts`
- `src/lib/credito-conexao/upsertLancamentoPorCobranca.ts`
- `src/app/api/matriculas/[id]/cancelar/route.ts`
- `src/app/api/admin/folha/colaboradores/[id]/importar-faturas/route.ts`
- `src/app/api/financeiro/folha/[folhaId]/importar-cartao-conexao/route.ts`
- `src/app/api/financeiro/folha/[folhaId]/detalhes/route.ts`
- `src/app/api/credito-conexao/faturas/[id]/route.ts`

## Estrategia de correcao

1. Corrigir a geracao mensal para:
   - nao criar/manter mensalidade para matricula cancelada
   - usar referencia canonica da matricula
   - reforcar `matricula_id` e origem rastreavel na cobranca/lancamento
2. Endurecer `upsertLancamentoPorCobranca` para bloquear cobranca cancelada, item cancelado, matricula cancelada ou cadeia orfa.
3. Corrigir a rota de cancelamento da matricula para cancelar toda a cadeia derivada ainda aberta:
   - cobrancas ligadas por origem principal ou canonica
   - lancamentos da Conta Interna ligados por `matricula_id`, `origem_sistema` ou `cobranca_id`
   - pivots da fatura
   - recomposicao da folha quando a fatura ja havia sido importada
4. Criar migration corretiva para localizar e limpar residuos ja existentes com criterio rastreavel por origem, competencia e vinculacao.
5. Impedir reimportacao futura na folha validando a cadeia de origem da fatura antes do desconto.
6. Expor na UI da folha e na tela da fatura a rastreabilidade tecnica da origem para identificar descontos inconsistentes antes de consolidar.
