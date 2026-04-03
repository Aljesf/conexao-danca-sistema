# 📘 Contexto — Documentos

## 1. O que é o domínio

Responsável por:

- contratos
- termos
- recibos
- declarações
- formulários institucionais

Documentos são gerados a partir de operações do sistema.

## 2. Estado atual real

O sistema possui:

- modelos de documentos
- documentos emitidos
- integração com:
  - matrícula
  - financeiro
  - pessoas

Tipos comuns:

- contrato
- termo
- recibo
- declaração

## 3. Papel dos documentos

Documento:

- não executa regra financeira
- não define valor
- não define vencimento

Documento:

- formaliza
- registra
- dá validade institucional

## 4. Integração com outros domínios

### Matrículas

- geram contratos
- geram termos

### Financeiro

- gera recibos
- pode gerar documentos de cobrança

### Loja/Café

- gera comprovantes e recibos

## 5. Problemas atuais

- possível mistura de responsabilidades
- risco de documentos assumirem papel financeiro
- necessidade de padronização de variáveis

## 6. Direção institucional

Padronizar:

- documentos como camada declarativa
- separação total de:
  - documento
  - regra financeira
  - execução operacional

Hierarquia:

- regras institucionais
- financeiro
- contrato/documento

## 7. Regras para o Codex

- nunca colocar lógica financeira em documentos
- nunca usar documento como fonte de verdade de valor
- sempre tratar documento como:
  - representação formal
- manter integração com:
  - matrícula
  - financeiro
  - pessoas
