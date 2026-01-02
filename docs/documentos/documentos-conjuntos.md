# 📘 Documentos — Conjuntos de Documentos
Sistema Conexão Dança

> **Documento subordinado ao domínio DOCUMENTOS.**  
> Este arquivo define os **Conjuntos de Documentos institucionais**,  
> reutilizáveis em diferentes operações do sistema.  
>
> Documento pai obrigatório:  
> 📄 `docs/documentos/documentos-visao-geral.md`  
>
> Documento relacionado:  
> 📄 `docs/documentos/documentos-operacoes.md`

---

## 1. Objetivo deste documento

Este documento tem como objetivo:

- definir o que é um **Conjunto de Documentos** no sistema;
- padronizar os conjuntos utilizados pela escola;
- permitir reutilização dos mesmos conjuntos em múltiplas operações;
- servir como base para implementação futura de cadastro e gestão de conjuntos.

Este documento **não cria regras automáticas** nem substitui decisões humanas no MVP.

---

## 2. O que é um Conjunto de Documentos

Um **Conjunto de Documentos** é um agrupamento institucional de documentos
que fazem sentido **em conjunto**, independentemente da operação específica.

Ele responde à pergunta:
> “Quais documentos, como escola, costumamos exigir juntos neste contexto?”

Um conjunto:
- **não executa lógica**;
- **não cria documentos sozinho**;
- é apenas uma **organização institucional padronizada**.

---

## 3. Estrutura interna de um Conjunto

Todo conjunto é organizado internamente por **Grupos de Documentos**.

Grupos são divisões lógicas dentro do conjunto e servem para:
- separar função dos documentos;
- orientar a ordem de emissão e assinatura;
- facilitar entendimento humano.

Exemplos de grupos:
- Documento principal
- Termos obrigatórios
- Termos opcionais
- Anexos

---

## 4. Conjuntos institucionais padrão

Abaixo estão os **conjuntos oficiais iniciais** do Sistema Conexão Dança.  
Novos conjuntos podem ser adicionados conforme evolução institucional.

---

### 4.1 Conjunto: Matrícula Regular

**Finalidade:**  
Formalizar a matrícula de aluno pagante em curso regular.

**Grupos internos:**

- **Documento principal**
  - Contrato de Prestação de Serviços Educacionais (modelos por ano/tier)

- **Termos obrigatórios**
  - Termo de ciência das Regras Oficiais
  - Regulamento interno (quando aplicável)

- **Termos opcionais**
  - Termo de uso de imagem
  - Outros termos institucionais

---

### 4.2 Conjunto: Bolsa Movimento

**Finalidade:**  
Formalizar a concessão de bolsa artística ou social.

**Grupos internos:**

- **Documento principal**
  - Termo / Contrato de Concessão de Bolsa

- **Termos complementares**
  - Termo de contrapartida (quando houver)
  - Termo de ciência das condições da bolsa

- **Termos opcionais**
  - Termo de uso de imagem

---

### 4.3 Conjunto: Curso Livre / Workshop

**Finalidade:**  
Formalizar participação em cursos livres, workshops ou atividades pontuais.

**Grupos internos:**

- **Documento principal**
  - Contrato de Curso Livre
  - Termo de adesão simplificado

- **Termos opcionais**
  - Termo de uso de imagem
  - Autorizações específicas

---

### 4.4 Conjunto: Venda Loja

**Finalidade:**  
Registrar venda de produtos ou serviços da loja.

**Grupos internos:**

- **Documento principal**
  - Recibo de venda
  - Comprovante de pagamento

- **Documentos complementares**
  - Termo de troca/devolução (quando aplicável)

---

### 4.5 Conjunto: Prestação de Serviço

**Finalidade:**  
Formalizar contratação de professores, coreógrafos ou prestadores externos.

**Grupos internos:**

- **Documento principal**
  - Contrato de Prestação de Serviços

- **Termos complementares**
  - Termo de confidencialidade
  - Termo de cessão de direitos (quando aplicável)

---

## 5. Reutilização de Conjuntos

Um mesmo conjunto pode ser utilizado por diferentes operações.

Exemplos:
- O conjunto **Matrícula Regular** pode ser usado em:
  - MATRÍCULA_REGULAR
  - REMATRÍCULA
- O conjunto **Venda Loja** pode ser usado em:
  - VENDA_LOJA
  - VENDA_EVENTO

A operação define **quando** o conjunto é usado;  
o conjunto define **como** os documentos se organizam.

---

## 6. Relação com Modelos de Documento

Os conjuntos **não contêm texto**.

Eles apenas:
- referenciam grupos;
- cada grupo referencia **modelos possíveis**;
- a escolha do modelo pode variar conforme contexto (ano, perfil, condição).

---

## 7. Diretriz institucional

Todo novo conjunto criado deve:

1. possuir uma finalidade clara;
2. ter grupos bem definidos;
3. ser registrado neste documento;
4. evitar duplicação conceitual com conjuntos existentes.

Este documento é a **lista oficial de conjuntos institucionais** da escola.

---

# Fim do documento
