# 📘 Contexto Global do Sistema — Conexão Dança

## 1. Visão geral

O sistema Conexão Dança (Conectarte) é uma plataforma de gestão integrada voltada para:

- Escola de dança
- Financeiro institucional
- Matrículas
- Turmas e diário de classe
- Loja
- Ballet Café
- Documentos institucionais
- Bolsas
- Conta Interna

A arquitetura geral segue estes princípios:

- Pessoa é o centro do sistema
- Matrícula é o vínculo principal
- Financeiro é rastreável e separado da camada pedagógica
- O sistema executa políticas institucionais, não cria política por conta própria
- Documentação é parte da governança técnica do projeto

## 2. Domínios principais

### Pessoas

Base central de identidade:

- alunos
- responsáveis
- colaboradores
- professores
- fornecedores

### Matrículas

Representam o vínculo formal do aluno com o produto educacional.

### Turmas

Representam a execução pedagógica e organizacional.

### Financeiro

Baseado em:

- cobranças
- recebimentos
- movimento financeiro
- centros de custo
- contas financeiras
- conta interna
- contas a pagar

### Conta Interna

Nome institucional atual para o mecanismo de controle financeiro interno de alunos e colaboradores.

Observação importante:

- o código e parte da documentação ainda contêm nomenclaturas legadas
- a linguagem de negócio oficial daqui para frente deve preferir `Conta Interna`

### Bolsa

Nome institucional atual para o vínculo de benefício institucional do aluno.

Observação importante:

- o código e parte da documentação ainda podem conter nomenclatura anterior
- a linguagem de negócio oficial daqui para frente deve preferir `Bolsa`

### Loja e Ballet Café

Domínios operacionais integrados ao financeiro.

### Documentos

Motor institucional para contratos, termos, recibos, declarações e documentos emitidos.

## 3. Diretriz de leitura

Ao interpretar o sistema, sempre distinguir:

### 3.1 Estado atual real

- nomes técnicos e legados ainda existentes no banco, rotas, helpers e documentos antigos
- regras efetivamente já implementadas

### 3.2 Direção institucional

Linguagem nova e oficial a ser usada em:

- textos de interface
- novos documentos
- novas páginas
- novos contextos
- novas descrições para agentes

## 4. Objetivo desta camada

Esta pasta existe para permitir que o agente leia o projeto de forma mais inteligente, mais rápida e com menos ambiguidades, sem depender de percorrer todos os documentos longos a cada tarefa.
