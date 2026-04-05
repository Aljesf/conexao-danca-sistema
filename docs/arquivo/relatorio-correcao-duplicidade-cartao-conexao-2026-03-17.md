# Relatorio de Correcao - Duplicidade de Cobrancas da Conta Interna

## Causa raiz confirmada
- A matricula criava cobranca mensal local com `origem_tipo = MATRICULA` e `origem_subtipo = CARTAO_CONEXAO`.
- O faturamento da Conta Interna criava a cobranca canonica da fatura com `origem_tipo = FATURA_CREDITO_CONEXAO`.
- Os dois fluxos eram validos isoladamente, mas nao havia coordenacao nem guarda de idempotencia transversal.

## Decisao arquitetural adotada
- A mensalidade da Conta Interna passa a nascer como lancamento elegivel em `credito_conexao_lancamentos`.
- A cobranca externa/canonica passa a ser fonte unica da fatura.
- A reaplicacao da cobranca canonica fica centralizada em um helper unico.

## O que mudou no SQL
- Foi criada a auditoria previa em [20260317_auditoria_pre_indice_fatura_credito_conexao.sql](C:/Users/aliri/conexao-dados/supabase/sql/correcoes/20260317_auditoria_pre_indice_fatura_credito_conexao.sql).
- Foi criada a correção em [20260317_correcao_duplicidade_cartao_conexao.sql](C:/Users/aliri/conexao-dados/supabase/sql/correcoes/20260317_correcao_duplicidade_cartao_conexao.sql).
- A auditoria retornou zero duplicidades canônicas remanescentes por `origem_id`.
- O indice parcial unico `ux_cobrancas_fatura_credito_conexao_ativa` foi aplicado em `public.cobrancas`.

## O que mudou na API de matricula
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/matriculas/liquidacao-primeira/route.ts) deixou de criar `cobrancas` mensais `MATRICULA/CARTAO_CONEXAO`.
- A rota agora gera apenas lancamentos idempotentes por `matricula + competencia`, usando `referencia_item`.
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/escola/matriculas/[id]/reprocessar-financeiro/route.ts) foi alinhada com a mesma separacao e passou a bloquear reprocessamento quando o lancamento ja existe.
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/matriculas/novo/route.ts) foi revisada; o fluxo continua delegando a liquidacao para `liquidacao-primeira`, sem criacao direta adicional de cobranca mensal nessa etapa.

## O que mudou na API/faturamento da Conta Interna
- Foi criado o helper [getOrCreateCobrancaCanonicaFatura.ts](C:/Users/aliri/conexao-dados/src/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura.ts).
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts) passou a reutilizar a cobranca canônica existente e falhar com erro controlado em duplicidade.
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts) passou a delegar para o helper canônico antes de chamar o provider.
- [route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts) foi alinhada para nao depender de insert local cego nem de `cobranca_id` nos lancamentos.
- [upsertLancamentoPorCobranca.ts](C:/Users/aliri/conexao-dados/src/lib/credito-conexao/upsertLancamentoPorCobranca.ts) passou a aceitar lancamento idempotente por `referencia_item` sem exigir `cobranca_id`.

## Riscos de regressao
- Fluxos legados fora do escopo desta etapa que ainda criem `MATRICULA/CARTAO_CONEXAO` precisam ser revisados separadamente.
- Consultas antigas que assumem `credito_conexao_lancamentos.cobranca_id` sempre preenchido podem precisar de ajuste gradual.
- O fechamento legado de faturas continua precisando de vigilancia operacional ate sua consolidacao total no fluxo moderno.

## Como validar manualmente
1. Matricula da Conta Interna: confirmar que o fluxo gera lancamento em `credito_conexao_lancamentos` e nao cria nova linha em `public.cobrancas` com `origem_tipo = MATRICULA` e `origem_subtipo = CARTAO_CONEXAO`.
2. Geracao/fechamento de fatura: executar a geracao duas vezes para a mesma fatura e confirmar reaproveitamento do mesmo `cobranca_id`.
3. Reprocessamento financeiro: confirmar que a mesma matricula/competencia e bloqueada quando o lancamento elegivel ja existe.
4. Auditoria SQL: confirmar que a query de pre-indice continua sem duplicidades canônicas ativas.

## Validacao executada nesta etapa
- `npm run build` passou.
- A auditoria SQL retornou zero duplicidades canônicas remanescentes.
- O indice `ux_cobrancas_fatura_credito_conexao_ativa` foi aplicado no banco.
- O helper canônico foi executado duas vezes seguidas sobre a fatura `329` e reutilizou a mesma cobranca `414`, mantendo `1` cobranca ativa para a fatura.
