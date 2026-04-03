# 📘 Nomenclatura Oficial de Negócio — Sistema Conexão Dança

## 1. Objetivo

Este documento registra a nomenclatura oficial de negócio que deve orientar futuras alterações do sistema, sem apagar imediatamente a nomenclatura técnica/legada já existente.

## 2. Regra geral

Sempre distinguir:

- nome técnico / legado atual
- nome institucional / de negócio oficial

A refatoração completa do código será gradual.
Este documento existe para impedir contradições durante a transição.

## 3. Conta Interna

### 3.1 Nome institucional oficial

Usar, daqui para frente, na linguagem de negócio:

- `Conta Interna`
- `Conta Interna Aluno`
- `Conta Interna Colaborador`

### 3.2 Legado técnico possível

O sistema pode ainda conter nomes antigos em:

- banco
- rotas
- helpers
- documentação histórica
- textos antigos de UI

Esses nomes antigos devem ser tratados como legado técnico, não como nome oficial de negócio.

### 3.3 Regra operacional

Ao criar:

- novos textos de interface
- novos documentos
- novos resumos
- novas instruções para agentes

Preferir sempre:

- `Conta Interna`
- `Conta Interna Aluno`
- `Conta Interna Colaborador`

### 3.4 Regra de segurança

Não renomear automaticamente o banco, as APIs, os tipos ou os arquivos antigos sem etapa própria de refatoração.

## 4. Bolsa

### 4.1 Nome institucional oficial

Usar, daqui para frente, na linguagem de negócio:

- `Bolsa`

### 4.2 Legado técnico possível

O sistema pode ainda conter nomenclaturas anteriores em:

- documentos antigos
- registros institucionais anteriores
- textos antigos
- helpers ou telas legadas

Esses nomes antigos devem ser tratados como legado, não como linguagem oficial de negócio.

### 4.3 Regra operacional

Ao criar:

- novos textos de interface
- novos documentos
- novas páginas
- novas descrições operacionais

Preferir sempre:

- `Bolsa`

### 4.4 Regra de segurança

Não fazer renomeação automática ampla no código nesta etapa.

## 5. Regras para o Codex

Sempre que o Codex atuar no projeto:

- identificar se está lidando com:
  - estrutura técnica legada
  - linguagem institucional nova
- em novas implementações textuais:
  - preferir `Conta Interna`
  - preferir `Bolsa`
- em código legado:
  - não fazer renomeação estrutural sem comando explícito para refatoração completa
- em documentação nova:
  - registrar explicitamente quando um nome é legado e quando é oficial

## 6. Resumo executivo

### Linguagem oficial daqui para frente

- `Conta Interna`
- `Conta Interna Aluno`
- `Conta Interna Colaborador`
- `Bolsa`

### Linguagem legada

- qualquer terminologia antiga ainda presente em banco, código, rotas ou documentos históricos
