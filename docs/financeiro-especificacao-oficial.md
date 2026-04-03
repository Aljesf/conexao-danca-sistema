# Modulo Financeiro - Especificacao Oficial
**Sistema:** Conexao Danca  
**Versao:** 2.0  
**Data:** 2026-04-03  
**Status:** Documento canonico

Este documento e a fonte unica de verdade do modulo financeiro.
Todo novo codigo, correcao ou evolucao deve ser compativel com as regras aqui registradas.

---

## 1. Visao Geral

O modulo financeiro unifica as operacoes de Escola, Loja e Cafe em um unico modelo contabil e operacional.
O sistema atual e instalacao unica, mas todas as novas estruturas devem ser pensadas para futura evolucao SaaS.

---

## 2. Centros De Custo

Centros de custo ativos:

| Codigo | Nome | Finalidade |
|--------|------|------------|
| `ESCOLA` | Escola Conexao Danca | mensalidades, eventos, servicos academicos |
| `LOJA` | AJ Dance Store | vendas de produtos |
| `CAFE` | Ballet Cafe | comandas e vendas alimenticias |
| `FIN` | Intermediacao Financeira | camara de compensacao da Conta Interna |

Regra:
- todo lancamento financeiro deve ter centro de custo
- pagamentos a vista vao direto ao centro operacional
- operacoes a credito passam pelo `FIN`

---

## 3. Contas Financeiras

Contas financeiras ativas:

| ID | Nome | Tipo | Centro |
|----|------|------|--------|
| 1 | Conta bancaria principal - Escola | BANCO | ESCOLA |
| 2 | Conta bancaria principal - Loja | BANCO | LOJA |
| 3 | Conta bancaria principal - Ballet Cafe | BANCO | CAFE |
| 4 | Caixa fisico - Escola | CAIXA | ESCOLA |
| 5 | Caixa fisico - Loja | CAIXA | LOJA |
| 6 | Caixa fisico - Ballet Cafe | CAIXA | CAFE |
| 7 | Conta Intermediacao Financeira (FIN) | VIRTUAL | FIN |

Regra:
- a conta financeira de destino deve ser coerente com o contexto de pagamento
- `formas_pagamento_contexto` define a conta padrao por centro e forma

---

## 4. Formas De Pagamento

Formas de liquidacao imediata:
- `DINHEIRO`
- `PIX`
- `CREDITO_AVISTA`
- `CREDITO_PARCELADO`

Formas que lancam na Conta Interna:
- `CREDITO_ALUNO`
- `CARTAO_CONEXAO_ALUNO`
- `CREDIARIO_COLAB`
- `CARTAO_CONEXAO_COLAB`

Regra de nomenclatura:
- em interface e documentacao, usar sempre `Conta Interna`
- `Cartao Conexao` fica restrito a legado tecnico

---

## 5. Conta Interna

Estruturas principais:
- `credito_conexao_contas`
- `credito_conexao_lancamentos`
- `credito_conexao_faturas`
- `credito_conexao_fatura_lancamentos`
- `credito_conexao_configuracoes`
- `credito_conexao_regras_parcelas`

Tipos:
- `ALUNO`
- `COLABORADOR`

Cada lancamento da Conta Interna nasce com centro de custo de origem e participa do ciclo mensal da conta correspondente.

---

## 6. Ciclo Da Conta Interna Do Aluno

1. Lancamentos nascem como `PENDENTE_FATURA`
2. No ultimo dia do mes, a fatura e fechada
3. Lancamentos do periodo vao para a fatura
4. O vencimento padrao e dia 12 do mes seguinte
5. A cobranca externa e criada na Neofim
6. Quando o pagamento e confirmado, o sistema gera recebimento, movimento financeiro e classificacao por centro

Regra:
- `dia_fechamento = 0` significa ultimo dia do mes

---

## 7. Ciclo Da Conta Interna Do Colaborador

1. Lancamentos nascem na Conta Interna do colaborador
2. A fatura mensal e gerada para desconto em folha
3. A folha importa as faturas elegiveis
4. O desconto entra como `DESCONTO_CREDITO_CONEXAO`

---

## 8. Faturas

Tabela principal:
- `credito_conexao_faturas`

Campos principais:
- `status`
- `data_fechamento`
- `data_vencimento`
- `valor_total_centavos`
- `valor_taxas_centavos`
- `cobranca_id`
- `neofin_invoice_id`

Status principais:
- `ABERTA`
- `FECHADA`
- `EM_ATRASO`
- `PAGA`
- `CANCELADA`

---

## 9. Lancamentos

Tabela principal:
- `credito_conexao_lancamentos`

Campos relevantes:
- `conta_conexao_id`
- `matricula_id`
- `competencia`
- `centro_custo_id`
- `origem_sistema`
- `status`
- `numero_parcelas`
- `referencia_item`

Regras:
- idempotencia por referencia tecnica
- centro de custo sempre definido na origem
- apenas lancamentos `PENDENTE_FATURA` sao recalculados em fluxos corretivos

---

## 10. Tiers Financeiros

Estruturas:
- `financeiro_tier_grupos`
- `financeiro_tiers`

Regra atual de aluno:
- `1a matricula -> tier 1`
- `2a matricula -> tier 2`
- `3a ou mais -> tier 3`

O recalcule de tiers apos cancelamento esta implementado e atua apenas sobre lancamentos ainda nao faturados.

---

## 11. Matriculas

Pontos financeiros relevantes:
- prorata configuravel por `dia_corte_prorata`
- `data_limite_exercicio` bloqueia competencias alem do limite
- taxa de matricula pode gerar cobranca separada
- bolsa parcial separa valor familia do valor institucional

Estruturas relacionadas:
- `matriculas`
- `matricula_execucao_valores`
- `matriculas_financeiro_linhas`

---

## 12. Eventos

O financeiro de eventos usa:
- `eventos_escola_inscricao_item_movimentos_financeiros`
- `eventos_escola_inscricao_parcelas_conta_interna`
- `cobrancas`
- `credito_conexao_lancamentos`

Regras:
- eventos vinculados ao centro de custo `ESCOLA`
- parcelas em Conta Interna respeitam o limite do exercicio
- idempotencia de cobrancas de eventos foi corrigida com constraint unica

---

## 13. Contas A Pagar

Tabela principal:
- `contas_pagar`

Fluxo:
1. conta criada
2. pagamento registrado
3. baixa gera `movimento_financeiro` de saida

Nao ha trigger automatica; o fluxo e controlado por API.

---

## 14. Movimento Financeiro

Tabela principal:
- `movimento_financeiro`

Regra de uso:
- registra somente dinheiro realizado
- receitas e despesas efetivas
- rateios da Conta Interna materializados apos confirmacao de pagamento

O tipo legado `ENTRADA` foi normalizado para `RECEITA`.

---

## 15. Integracao Com A Neofim

A Neofim e a plataforma de cobranca externa atual.
Ela nao suporta webhook customizado para sistemas proprios e foi desenhada prioritariamente para integracao com o Omie.

### 15.1 Estrategia adotada

A estrategia oficial e polling automatico a cada 6 horas, consultando o status de cada cobranca pendente diretamente na API da Neofim.

- Rota do polling: `GET /api/governanca/cobrancas/poll-neofin`
- Schedule: `15 */6 * * *`
- Protecao: `CRON_SECRET`

### 15.2 Fluxo do polling

1. Busca cobrancas `PENDENTE` ou `AGUARDANDO` com `neofin_charge_id`
2. Para cada uma, consulta `GET /billing/{identifier}`
3. Se status remoto for `paid`, chama `confirmarPagamentoCobranca`
4. Se status remoto for `not found`, registra em `neofim_webhook_log`
5. Retorna resumo do processamento

### 15.3 Autenticacao da API Neofim

- Header `api-key: <NEOFIN_API_KEY>`
- Header `secret-key: <NEOFIN_SECRET_KEY>`
- URL base: `process.env.NEOFIN_BASE_URL`

### 15.4 Decisao arquitetural

No futuro, o sistema deve migrar para integracao bancaria direta, reduzindo a dependencia da Neofim.

---

## 16. Folha De Pagamento

Estruturas:
- `folha_pagamento`
- `folha_pagamento_colaborador`
- `folha_pagamento_itens`

Fluxo:
1. abrir folha
2. gerar espelho
3. importar Conta Interna do colaborador
4. ajustar itens manuais
5. fechar folha

Limitacao atual:
- nao ha calculo automatico por jornada ou ponto

---

## 17. IA Financeira

O sistema possui analises financeiras automatizadas com snapshots diarios.

Analises atuais:
- liquidez
- queda de entradas
- aceleracao de saidas
- inadimplencia
- risco operacional da Conta Interna

Cron:
- rota `GET /api/financeiro/dashboard-inteligente/cron-diario`
- schedule `0 6 * * *`
- protecao `CRON_SECRET`

---

## 18. Relatorios

Relatorios implementados:
- dashboard financeiro
- dashboard inteligente
- dashboard por centro de custo
- devedores em atraso
- governanca Neofim
- receita por centro de custo

Relatorios em evolucao:
- construtor de relatorios
- investimento em bolsas
- conciliacao bancaria
- visao fiscal

---

## 19. Plano De Contas E Categorias

Relacao:
- `categorias_financeiras.plano_conta_id -> plano_contas.id`

Receitas ativas incluem:
- `MENSALIDADE`
- `WORKSHOP`
- `VENDA_LOJA`
- `VENDA_CAFE`
- `VENDA_CALCADOS`
- `VENDA_VESTUARIO`

Despesas ativas incluem:
- `SALARIO_PROFESSOR`
- `SALARIO_COLABORADOR`
- `DESCONTO_CONSUMO_LOJA`
- `DESCONTO_CONSUMO_CAFE`
- `COMPRA_CALCADOS`
- `COMPRA_VESTUARIO`

---

## 20. Configuracoes Globais

| Configuracao | Valor |
|-------------|-------|
| `dia_fechamento_faturas` | `0` |
| `dia_vencimento ALUNO` | `12` |
| `dia_vencimento COLABORADOR` | `12` |
| `dia_corte_prorata` | `12` |
| `data_limite_exercicio` | `2026-12-12` |
| `taxa_matricula_ativa` | `false` |
| `multa ALUNO` | `2%` |
| `juros_dia ALUNO` | `0,0333%` |

---

## 21. Evolucao Para Multi-Tenant

Decisao registrada em 2026-04-03:
toda nova tabela financeira deve prever `organizacao_id` para suportar isolamento por organizacao no futuro.

O sistema atual e instalacao unica, sem multi-tenancy.

---

## 22. Estado Do Sistema - 2026-04-03

### 22.1 Itens implementados e validados

- Idempotencia de cobrancas de eventos
- Scheduler de fechamento mensal na Vercel
- Polling automatico da Neofim a cada 6h
- Webhook da Neofim implementado
- Dia de fechamento corrigido para ultimo dia do mes
- PIX e cartao do Cafe na conta financeira correta
- Formas de pagamento presencial configuradas na Escola
- Pro-rata configuravel
- Data limite do exercicio configuravel
- Taxa de matricula implementada
- Recalculo automatico de tiers na desmatricula
- Limite de credito com bloqueio real
- Multa e juros aplicados em faturas em atraso
- FIN implementado como camara de compensacao
- Limpeza principal de dados de teste e inconsistencias

### 22.2 Pendencias conhecidas

- `M10`: passivo de faturas sem `neofin_invoice_id`
- `B6`: Loja sem perfil do comprador e sem tabela de preco por perfil
- `B4`: multi-tenancy financeiro ainda nao implementado
- folha de `2026-03` para fechamento manual
- caso Aurora Cunha Silva encerrado, sem acao automatica pendente

### 22.3 Configuracoes atuais do sistema

| Configuracao | Valor |
|-------------|-------|
| `dia_fechamento_faturas` | `0` (ultimo dia do mes) |
| `dia_vencimento ALUNO` | `12` |
| `dia_vencimento COLABORADOR` | `12` |
| `dia_corte_prorata` | `12` |
| `data_limite_exercicio` | `2026-12-12` |
| `taxa_matricula_ativa` | `false` |
| `multa ALUNO` | `2%` |
| `juros_dia ALUNO` | `0,0333%` |
| `Parcelamento ALUNO` | `1x, 2x, 3x` |
| `Salario minimo colaboradores` | `R$ 1.621,00` |
| `Scheduler fechamento` | ultimo dia do mes as 23h |
| `Scheduler polling Neofim` | a cada 6h no minuto 15 |
| `Scheduler IA diaria` | todo dia as 6h |

---

*Fim do documento - financeiro-especificacao-oficial.md*  
*Proxima revisao: apos o proximo ciclo financeiro relevante*
