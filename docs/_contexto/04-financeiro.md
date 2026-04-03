# 📘 Contexto — Financeiro

## 1. O que é o domínio

Responsável por:

- cobranças
- recebimentos
- contas a pagar
- movimento financeiro
- centros de custo
- conta interna

## 2. Estado atual real

O sistema utiliza:

- `cobrancas` como unidade financeira canônica
- recebimentos para liquidação
- `movimento_financeiro` para fluxo de caixa
- integração com `Conta Interna` (estrutura já existente no banco)

Características:

- cobrança gera lançamento
- lançamento pode gerar fatura
- fatura gera cobrança consolidada
- pagamento gera recebimento

## 3. Conta Interna

Nome oficial de negócio:

👉 `Conta Interna`

Situação atual:

- ainda existem nomes técnicos legados no sistema
- funcionamento baseado em lançamentos e faturas

Regras:

- não é pagamento imediato
- gera obrigação futura
- consolida em ciclo

## 4. Problemas atuais

- nomenclatura inconsistente (legado vs institucional)
- mistura de conceitos:
  - cobrança
  - fatura
  - conta interna
- telas com sobrecarga de dados

## 5. Direção institucional

Padronizar:

- `Conta Interna` como nome oficial
- cobrança como unidade base
- fatura como consolidação
- pagamento apenas na liquidação

Separações obrigatórias:

- cobrança ≠ recebimento
- conta interna ≠ caixa
- financeiro ≠ matrícula

## 6. Regras para o Codex

- nunca criar lógica financeira fora de `cobrancas`
- nunca usar nome legado em novas telas
- sempre usar:
  - `Conta Interna`
- não duplicar lógica entre módulos
- sempre manter rastreabilidade
