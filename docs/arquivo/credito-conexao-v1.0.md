# Conta Interna - Especificacao Funcional & Tecnica v1.0

> Padrão operacional atual: [Conta Interna — Cobranças, Lançamentos e Faturas](./financeiro/cartao-conexao-cobrancas.md)


> Nome do produto (para o usuario):
> - **Conta Interna do Aluno**
> - **Conta Interna do Colaborador**
>
> Nome tecnico (banco/API): **Conta Interna** (tabelas usam prefixo `credito_conexao`)

---

## 1. Visao geral

A **Conta Interna** e o sistema de **cartao de credito interno** da Conexao Danca.

Ele substitui o conceito de crediario, permitindo que:

- Pais/responsaveis utilizem a **Conta Interna do Aluno** para compras na escola, loja e cafe.
- Colaboradores utilizem a **Conta Interna do Colaborador** para compras internas.
- Todas as compras ao longo do mes sao consolidadas em uma **fatura mensal**.
- O pagamento ocorre via:
  - Boleto Neofin (para Alunos)
  - Desconto em folha + transferencia entre contas (para Colaboradores)

---

## 2. Relacao com o Financeiro atual

O modulo Conta Interna utiliza a infraestrutura existente:

- `cobrancas`
- `recebimentos`
- `movimento_financeiro`
- `contas_financeiras`
- `centros_custo`
- `formas_pagamento` e `formas_pagamento_contexto`

Fluxo:

1. Conta Interna -> gera **lancamentos**  
2. Lancamentos -> geram **faturas**  
3. Faturas -> geram **cobranca** (Alunos) ou **desconto em folha** (Colaboradores)  
4. Pagamento -> gera **recebimento + movimento financeiro**

---

## 3. Conceitos do dominio

### 3.1. Conta Interna

Representa uma "conta/cartao" interna:

- **Conta Interna do Aluno** (para pais/responsaveis)
- **Conta Interna do Colaborador**

Armazena:
- titular
- dia de fechamento e vencimento
- contas financeiras integradas
- configuracoes de ciclo
- limites (futuro)

### 3.2. Lancamento da Conta Interna

Transacao que ira compor a fatura:

- compra na loja
- consumo no cafe
- servicos da escola
- ajustes
- estornos

### 3.3. Fatura da Conta Interna

Consolida lancamentos de um periodo:

- gera cobranca + boleto (Aluno)
- gera desconto em folha + transferencia entre contas (Colaborador)

### 3.4. Pagamento da fatura

- Aluno: via boleto Neofin ou pagamento presencial
- Colaborador: desconto automatico na folha

---

## 4. Forma de Pagamento & Forma Base

### Forma Base nova:

```ts
CARTAO_CONEXAO
Formas de pagamento configuradas:
Cartao Conexao Aluno

tipo_base = CARTAO_CONEXAO

tipo_conta = ALUNO

Cartao Conexao Colaborador

tipo_base = CARTAO_CONEXAO

tipo_conta = COLABORADOR
```

Na Frente de Caixa:

Selecionou Conta Interna -> nao gera recebimento imediato.

Gera lancamento interno.

## 5. Modelo de Dados (conceitual)

### 5.1. Tabelas principais

1) **credito_conexao_contas**  
Representa a conta interna.

Campos (conceito):

- id
- pessoa_titular_id
- tipo_conta (ALUNO, COLABORADOR, etc.)
- descricao_exibicao
- dia_fechamento
- dia_vencimento (Aluno)
- centro_custo_principal_id
- conta_financeira_origem_id
- conta_financeira_destino_id
- limite_credito_centavos (futuro)
- ativo

2) **credito_conexao_lancamentos**  
Transacoes que irao compor a fatura.

Campos:

- id
- conta_conexao_id
- origem_sistema (LOJA, ESCOLA, CAFE, CONSULTA...)
- origem_id
- descricao
- valor_centavos
- data_lancamento
- status (PENDENTE_FATURA, FATURADO, CANCELADO)

3) **credito_conexao_faturas**  
Uma fatura por ciclo.

Campos:

- id
- conta_conexao_id
- periodo_referencia
- data_fechamento
- data_vencimento
- valor_total_centavos
- status (ABERTA, PAGA, EM_ATRASO)
- cobranca_id (Aluno)
- neofin_invoice_id
- folha_pagamento_id (Colaborador)

4) **credito_conexao_fatura_lancamentos**  
Relacao N:N entre faturas e lancamentos.

Campos:

- fatura_id
- lancamento_id

## 6. Fluxos

### 6.1. Conta Interna do Aluno

Durante o mes:
- Cada compra/consumo gera credito_conexao_lancamento.

Fechamento da fatura:
- No dia configurado: soma lancamentos, cria fatura, gera cobranca, solicita boleto Neofin.

Pagamento:
- Quando o boleto e pago: cria recebimento, gera movimento_financeiro, marca fatura como paga.

### 6.2. Conta Interna do Colaborador

Durante o mes:
- Compras internas geram lancamentos.

Fechamento da fatura:
- Consolida lancamentos e gera fatura.

Pagamento via folha:
- No fechamento da folha:
  - desconta o valor da fatura no salario
  - registra transferencia entre contas:
    - debita conta da folha (ex.: Escola)
    - credita conta da Loja

## 7. Etapas de Implementacao

- Etapa 1 — Criar tabelas do modulo Conta Interna
- Etapa 2 — Integrar com Formas de Pagamento (CARTAO_CONEXAO)
- Etapa 3 — Implementar lancamentos na venda
- Etapa 4 — Implementar fechamento da fatura (Aluno)
- Etapa 5 — Integracao Neofin (boletos)
- Etapa 6 — Fechamento e pagamento via folha (Colaborador)

## 8. Nome oficial do modulo

Produto: Conta Interna

- Conta Interna do Aluno
- Conta Interna do Colaborador

Tecnico: tabelas com prefixo `credito_conexao`

- credito_conexao_contas
- credito_conexao_lancamentos
- credito_conexao_faturas
- credito_conexao_fatura_lancamentos
