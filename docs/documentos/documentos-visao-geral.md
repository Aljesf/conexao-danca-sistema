# 📘 Documentos — Visão Geral do Domínio
Sistema Conexão Dança

> **Documento canônico do domínio DOCUMENTOS.**  
> Este arquivo define os conceitos, limites e responsabilidades do módulo de Documentos.  
> Todos os outros documentos (contratos, recibos, termos, formulários) são **derivações** deste domínio.

---

## 1. O que é o domínio Documentos

O domínio **Documentos** é responsável por:

- produzir documentos institucionais formais;
- registrar compromissos, declarações, recibos e termos;
- organizar modelos reutilizáveis;
- gerar instâncias preenchidas com dados reais do sistema;
- manter rastreabilidade e auditoria documental.

Documento **não é apenas contrato**.  
Contrato é **um tipo de documento**.

---

## 2. Conceitos fundamentais

### 2.1 Documento
Documento é qualquer peça formal produzida pelo sistema, com valor:
- jurídico,
- administrativo,
- financeiro,
- institucional.

Exemplos:
- contrato acadêmico;
- termo de concessão de bolsa;
- recibo de venda da loja;
- declaração;
- formulário preenchível.

---

### 2.2 Operação
Operação é o **evento do sistema que gera documentos**.

Exemplos:
- MATRÍCULA_REGULAR
- MATRÍCULA_BOLSA
- VENDA_LOJA
- EVENTO_INSCRICAO
- PRESTACAO_SERVICO

A operação **define o contexto** e **aciona a produção documental**.

---

### 2.3 Conjunto de Documentos
Um **Conjunto de Documentos** é o agrupamento institucional de documentos
associado a uma operação.

Ele responde à pergunta:
> “Quais documentos normalmente existem quando esta operação acontece?”

Exemplo:
- Conjunto “Matrícula Regular”
- Conjunto “Bolsa Movimento”
- Conjunto “Venda Loja”

---

### 2.4 Grupo de Documentos
Grupo de Documentos é uma **organização interna** dentro de um conjunto.

Serve para separar logicamente documentos por função.

Exemplos de grupos:
- Documento principal
- Termos obrigatórios
- Termos opcionais
- Anexos

---

### 2.5 Modelo de Documento
Modelo é o **template editável**, criado no editor rico, contendo:
- texto institucional;
- placeholders de variáveis;
- versão;
- tipo de documento.

O modelo **não contém dados reais**.

---

### 2.6 Documento Emitido
Documento Emitido é a **instância real**, gerada a partir de um modelo,
vinculada a uma operação concreta (ex.: matrícula #13).

Ele contém:
- snapshot de dados utilizados;
- variáveis resolvidas;
- status (rascunho, emitido, assinado, cancelado);
- referência à operação.

---

### 2.7 Variáveis
Variáveis são **campos reutilizáveis**, usados para preencher documentos.

Características:
- possuem código (ex.: ALUNO_NOME);
- possuem descrição humana;
- possuem origem (ALUNO, MATRÍCULA, FINANCEIRO, MANUAL, etc.);
- podem ser usadas em qualquer documento.

Variáveis pertencem ao **domínio Documentos**, não a contratos.

---

## 3. Tipos de Documento

Tipos de documento classificam a natureza do conteúdo.

Exemplos:
- CONTRATO
- TERMO
- RECIBO
- DECLARACAO
- FORMULARIO

Tipos não definem regras sozinhos; apenas categorizam.

---

## 4. Relação entre Documentos e Contratos

Contrato:
- é um **tipo de documento**;
- herda todas as regras do domínio Documentos;
- possui particularidades jurídicas próprias.

O documento de contrato **não é um módulo isolado**.
Ele é um **filho conceitual** do domínio Documentos.

---

## 5. Hierarquia de documentação

Este arquivo é a **fonte principal**.

Outros documentos devem ser subordinados a ele, por exemplo:

- documentos-tipo-contrato.md
- documentos-tipo-recibo.md
- documentos-operacoes.md
- documentos-variaveis.md

Nenhum desses deve redefinir conceitos já definidos aqui.

---

## 6. Diretriz final

O sistema deve tratar Documentos como um **motor institucional de produção documental**.

Qualquer evolução futura (PDF, assinatura, versionamento, auditoria)
deve respeitar os conceitos definidos neste arquivo.

---

# Fim do documento
