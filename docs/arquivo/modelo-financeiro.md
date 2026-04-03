[INÍCIO DO ARQUIVO] docs/modelo_financeiro.md

# 💰 Design System – Modelo Financeiro Conexão Dança

Este documento define o modelo financeiro base do sistema Conexão Dança, incluindo:

- Centros de custo (Escola, Loja, Lanchonete)
- Contas a receber (cobranças)
- Recebimentos (pagamentos efetuados)
- Contas a pagar (despesas)
- Movimento financeiro (caixa geral)
- Categorias financeiras
- Papel do contexto Administração em relação aos outros contextos

Ele é a referência oficial para qualquer nova tela ou feature que envolva dinheiro no sistema.

---

## 🧭 1. Conceito Geral

### 1.1 Três centros de custo

O sistema trabalha com três grandes “caixinhas” de dinheiro:

- ESCOLA – Conexão Dança  
- LOJA – AJ Dance Store  
- CAFE – Ballet Café  

Todos os lançamentos financeiros **sempre** devem apontar para um centro de custo.

---

## 🏛 2. Estrutura das Tabelas

### 2.1 centros_custo  
Representa cada área que movimenta dinheiro.

Campos:
- id
- codigo ('ESCOLA', 'LOJA', 'CAFE')
- nome
- ativo

### 2.2 cobrancas  (CONTAS A RECEBER)  
Tabela existente. Representa tudo que alguém está devendo.

Novas colunas:
- centro_custo_id
- origem_tipo
- origem_id

### 2.3 recebimentos  
Registro do pagamento efetivo de uma cobrança.

Campos:
- cobranca_id
- centro_custo_id
- valor_centavos
- data_pagamento
- metodo_pagamento
- origem_sistema
- observacoes

### 2.4 categorias_financeiras  
Classificação de tudo o que entra e sai.

Campos:
- tipo ('RECEITA' ou 'DESPESA')
- codigo
- nome
- ativo

### 2.5 contas_pagar  (CONTAS A PAGAR)  
Registro de despesas.

Campos:
- centro_custo_id
- categoria_id
- pessoa_id (professor/colaborador/fornecedor)
- descricao
- valor_centavos
- vencimento
- status
- metodo_pagamento
- observacoes

### 2.6 movimento_financeiro  (CAIXA CONSOLIDADO)

Campos:
- tipo ('RECEITA' ou 'DESPESA')
- centro_custo_id
- valor_centavos
- data_movimento
- origem ('RECEBIMENTO', 'CONTA_PAGAR', …)
- origem_id
- descricao

---

## 🔄 3. Fluxo Financeiro

CONTAS A RECEBER (cobrancas)  
⬇ pagamento  
RECEBIMENTOS  
⬇  
MOVIMENTO FINANCEIRO (entrada)

CONTAS A PAGAR  
⬇ pagamento  
MOVIMENTO FINANCEIRO (saída)

---

## 🎯 4. Regras de Comportamento

- Nada some da tela; atualizações são inline  
- Toda receita ou despesa alimenta movimento_financeiro  
- Centro de custo é obrigatório para todos os lançamentos  
- Rotas secundárias servem só para edição direta  
- Contexto ADMINISTRAÇÃO controla tudo:
  - categorias
  - centros de custo
  - contas a pagar
  - visão geral do caixa

---

## 🧩 5. Aplicações Futuras

Este modelo é a base para:

- Folha de pagamento de professor
- Controle de consumo de loja/café descontado em folha
- Relatórios de fluxo de caixa
- Controle de estoque + financeiro da loja
- Controle financeiro da cantina
- Financeiro das turmas (quando professores forem ligados às turmas)

---

_Fim do arquivo – modelo_financeiro.md_

[FIM DO ARQUIVO]
