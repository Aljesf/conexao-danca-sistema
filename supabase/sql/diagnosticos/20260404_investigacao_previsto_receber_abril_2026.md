# Investigacao e saneamento do relatorio "Previsto para Receber" - abril/2026

Data base: 2026-04-04

## Resumo executivo

- Anomalia 1 confirmada: 58 lancamentos vinculados a faturas fechadas ainda estavam com `status = PENDENTE_FATURA`.
- Anomalia 2 confirmada: 18 mensalidades `MATRICULA` estavam `PENDENTE_FATURA` apesar de ja estarem em faturas `FECHADA`.
- Anomalia 3 foi reclassificada: Claudia e Rosely nao eram cobrancas legadas duplicadas; eram lancamentos ainda expostos como pre-fatura pelo dashboard.
- Lote principal aplicado:
  - 81 lancamentos atualizados para `FATURADO`
  - 1 vinculo orfao removido da fatura cancelada `4`
  - 19 cobrancas legadas `MATRICULA / CARTAO_CONEXAO` canceladas
- Ajustes de codigo aplicados:
  - `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`
  - `src/app/api/financeiro/dashboard/mensal/route.ts`
  - `src/lib/financeiro/processarClassificacaoFinanceira.ts`
  - `src/lib/financeiro/confirmarPagamentoCobranca.ts`
  - `src/app/api/financeiro/cobrancas/registrar-pagamento-presencial/route.ts`

## Diagnostico consolidado

### Anomalia 1

Antes do saneamento:

- 58 linhas na query equivalente a `1A`
- quebra por origem:
  - `ESCOLA = 31`
  - `MATRICULA = 18`
  - `MATRICULA_REPROCESSAR = 8`
  - `CAFE = 1`

Conclusao:

- a hipotese foi validada
- inscricoes Brasilidade entram como `origem_sistema = 'ESCOLA'`
- o fechamento da fatura nao estava sincronizando todos os lancamentos vinculados para `FATURADO`

### Anomalia 2

Antes do saneamento:

- 18 linhas na query equivalente a `2A`

Conclusao:

- a hipotese foi validada
- era a mesma causa raiz da anomalia 1
- o caso da Halanna nao era falta de fatura; a fatura `64` ja existia e estava `FECHADA`, mas sem cobranca canonica vinculada

### Anomalia 3

Conclusao real:

- Claudia Moraes de Castro e Rosely de Souza Monteiro nao tinham cobranca legada ativa causando a linha do relatorio
- os itens reexpostos eram lancamentos `PENDENTE_FATURA` ligados a faturas ja fechadas
- o dashboard mensal foi ajustado para exibir como `LANCAMENTO` apenas pre-fatura real

## Correcoes aplicadas no banco

### Lote principal

- backfill de 81 lancamentos para `FATURADO`
- limpeza do vinculo `fatura_id = 4 / lancamento_id = 627`
- zerado `valor_total_centavos` da fatura `4`
- canceladas 19 cobrancas legadas:
  - `40, 74, 96, 118, 129, 151, 162, 173, 184, 206, 219, 263, 276, 304, 339, 361, 392, 403, 446`

### Fechamento manual posterior

#### Halanna Denise de Oliveira Demetrio

Aplicado:

- gerada a cobranca canonica da fatura `64`, resultando na cobranca `712`
- cancelada a cobranca legada `63`
- repontado o lancamento `59` para a cobranca `712`

Estado final:

- fatura `64` esta `FECHADA` com `cobranca_id = 712`
- cobranca `712` esta `PENDENTE`
- cobranca legada `63` esta `CANCELADA`
- lancamento `59` esta `FATURADO` e aponta para `712`

#### Kamilla Melo Faro

Aplicado:

- migrado o recebimento `110` para a cobranca canonica `703`
- repontado o movimento financeiro `83` para a cobranca `703`
- marcada a cobranca canonica `703` como `PAGO`
- marcada a fatura `136` como `PAGA`
- marcado o lancamento `136` como `PAGO`
- cancelada a cobranca legada `140`

Estado final local:

- cobranca `703` esta `PAGO`
- fatura `136` esta `PAGA`
- lancamento `136` esta `PAGO` e aponta para `703`
- cobranca legada `140` esta `CANCELADA`
- recebimento `110` agora referencia a cobranca `703`

Ressalva operacional:

- o billing NeoFin `38094818716008` continua remoto com `status = pending`
- a tentativa de baixa automatica retornou `403 Missing Authentication Token`
- o estado local e contabil ficou saneado, mas a conciliacao manual no provedor ainda e necessaria
- o billing remoto confirmou `integration_identifier = fatura-credito-conexao-136`
- a documentacao interna e a rota `src/app/api/financeiro/intermediacao-neofim/cancelar/route.ts` usam `PUT /billing/cancel/{integration_identifier}`
- nao foi possivel confirmar a causa do `403` como "fora do contexto de servidor", porque a chamada falhou mesmo com `NEOFIN_API_KEY` e `NEOFIN_SECRET_KEY` carregadas localmente

## Verificacao final

- `V1 = 0`
- duplicidade canonica por fatura/periodo = `0`
- `report_extras_apr = 0`

Estado final de Halanna:

- cobranca `63 = CANCELADA`
- cobranca `712 = PENDENTE`
- fatura `64 = FECHADA`
- lancamento `59 = FATURADO`

Estado final de Kamilla:

- cobranca `140 = CANCELADA`
- cobranca `703 = PAGO`
- fatura `136 = PAGA`
- lancamento `136 = PAGO`
- recebimento `110 -> cobranca_id = 703`
- movimento `83 -> origem_id = 703`

## Acao manual NeoFin

Consulta remota validada:

- `GET /billing/38094818716008`
- retorno confirmado com `integration_identifier = fatura-credito-conexao-136`

Acao manual preferida por API:

```bash
curl --request PUT \
  'https://api.neofin.services/billing/cancel/fatura-credito-conexao-136' \
  --header 'api-key: {NEOFIN_API_KEY}' \
  --header 'secret-key: {NEOFIN_SECRET_KEY}'
```

Validacao posterior:

```bash
curl 'https://api.neofin.services/billing/38094818716008' \
  --header 'api-key: {NEOFIN_API_KEY}' \
  --header 'secret-key: {NEOFIN_SECRET_KEY}'
```

Esperado apos cancelamento:

- `status = cancelled`

## Recomendacao de codigo

- o fechamento de fatura deve sempre sincronizar lancamentos vinculados para `FATURADO`
- o pagamento de cobranca canonica de fatura deve sempre propagar `PAGO` para os lancamentos vinculados
- a rota `registrar-pagamento-presencial` foi ajustada para fazer essa propagacao
- o suporte a `origem_tipo = 'FATURA_CREDITO_CONEXAO'` foi alinhado nos fluxos de classificacao e confirmacao de pagamento
