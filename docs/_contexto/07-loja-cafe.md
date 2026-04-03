# 📘 Contexto — Loja e Café

## 1. O que é o domínio

Responsável por:

- vendas de produtos (Loja)
- vendas de consumo (Café)
- controle de estoque
- fornecedores e compras
- integração com financeiro

## 2. Estado atual real

O sistema já possui:

### Loja

- produtos
- estoque
- vendas
- pedidos de compra
- fornecedores

### Café

- vendas operacionais
- centro de custo próprio
- integração com financeiro

Formas de pagamento:

- dinheiro / PIX (imediato)
- cartão externo
- `Conta Interna`

## 3. Conta Interna no contexto Loja/Café

Uso:

- cliente consome produto
- não há pagamento imediato
- gera obrigação futura

Fluxo:

- venda gera cobrança
- cobrança pode gerar lançamento interno
- consolidação ocorre por ciclo

## 4. Problemas atuais

- inconsistência de integração com financeiro em alguns fluxos
- possíveis lacunas em movimento financeiro
- nomenclatura ainda com legado em alguns pontos
- falta de padronização entre Loja e Café

## 5. Direção institucional

Padronizar:

- Loja e Café como módulos equivalentes no financeiro
- uso consistente de `Conta Interna`
- venda sempre gera efeito financeiro rastreável

Separações obrigatórias:

- venda ≠ recebimento
- estoque ≠ financeiro
- `Conta Interna` ≠ pagamento imediato

## 6. Regras para o Codex

- sempre integrar venda com `cobrancas`
- não gerar recebimento automático em `Conta Interna`
- usar nomenclatura:
  - `Conta Interna`
- manter coerência entre Loja e Café
- evitar duplicação de lógica financeira
