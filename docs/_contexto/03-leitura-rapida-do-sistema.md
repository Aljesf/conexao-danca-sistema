# 📘 Leitura Rápida do Sistema — Resumo para Agentes

## 1. O que este sistema é

Sistema de gestão integrado para escola de dança com módulos acadêmicos, financeiros, administrativos e operacionais.

## 2. O que um agente precisa saber primeiro

- o sistema tem documentação extensa
- a pasta `docs/_contexto/` existe para acelerar entendimento
- linguagem técnica antiga e linguagem institucional nova podem coexistir por um tempo
- isso não significa inconsistência, e sim transição controlada

## 3. Palavras oficiais de negócio

Usar preferencialmente:

- `Conta Interna`
- `Conta Interna Aluno`
- `Conta Interna Colaborador`
- `Bolsa`

## 4. O que NÃO assumir

- não assumir que a nomenclatura antiga já foi totalmente removida
- não assumir que todo texto legado está errado
- não assumir que documentação antiga pode ser apagada
- não assumir que renomeação de banco/código pode ser feita sem etapa própria

## 5. Como interpretar corretamente

### Se estiver lidando com UI nova

- usar linguagem oficial de negócio

### Se estiver lidando com código antigo

- preservar compatibilidade até comando explícito de refatoração

### Se estiver lidando com documentação nova

Sempre registrar:

- nome oficial
- eventual nome legado, quando necessário

## 6. Diretriz final

O projeto deve evoluir com:

- clareza de nomenclatura
- preservação do legado
- leitura rápida por contexto
- refatoração gradual e segura

## 7. Atualização contínua

Esta camada deve ser mantida continuamente atualizada.
Quando o sistema evoluir em arquitetura, contexto, nomenclatura ou domínio, os arquivos de `_contexto` e `estado-atual-do-projeto.md` devem ser revisados no mesmo ciclo da mudança.
