# 📘 Documentos — Operações
Sistema Conexão Dança

> **Documento subordinado ao domínio DOCUMENTOS.**  
> Este arquivo define como as **operações do sistema** acionam a produção de documentos,  
> por meio de **conjuntos** e **grupos de documentos**.  
>
> Documento pai obrigatório:  
> 📄 `docs/documentos/documentos-visao-geral.md`

---

## 1. Objetivo deste documento

Este documento tem como objetivo:

- mapear quais **operações do sistema** geram documentos;
- definir quais **conjuntos de documentos** são associados a cada operação;
- organizar os documentos em **grupos lógicos** dentro de cada conjunto;
- servir como referência para implementação futura de automação.

Este documento **não cria regras automáticas** nem substitui decisões humanas no MVP.

---

## 2. Conceito de Operação

No domínio Documentos, **Operação** é qualquer processo do sistema que:

- envolve pessoas, serviços ou produtos;
- gera efeitos administrativos, jurídicos ou financeiros;
- **exige a produção de documentos formais**.

A operação é o **gatilho** da documentação.

---

## 3. Estrutura geral: Operação → Conjunto → Grupo → Documento

A relação segue sempre esta hierarquia:

1. **Operação**
2. **Conjunto de Documentos**
3. **Grupo de Documentos**
4. **Modelo(s) de Documento**

- Uma operação possui **um ou mais conjuntos**.
- Um conjunto possui **um ou mais grupos**.
- Um grupo possui **um ou mais modelos possíveis**.

---

## 4. Operações principais do sistema

A lista abaixo representa as operações iniciais do Sistema Conexão Dança.  
Novas operações podem ser adicionadas sem quebrar o modelo.

---

### 4.1 MATRÍCULA_REGULAR

**Descrição:**  
Matrícula padrão de aluno pagante em curso regular.

#### Conjunto: Matrícula Regular

**Grupo 1 — Documento principal (obrigatório)**  
- Contrato Padrão (ano vigente)  
- Contrato com Condição Especial (ex.: desconto histórico)

**Grupo 2 — Termos obrigatórios**  
- Termo de ciência das Regras Oficiais  
- Regulamento interno (quando aplicável)

**Grupo 3 — Termos opcionais / condicionais**  
- Termo de uso de imagem  
- Outros termos institucionais

---

### 4.2 MATRÍCULA_BOLSA

**Descrição:**  
Matrícula de aluno beneficiado por bolsa artística ou social.

#### Conjunto: Bolsa Movimento

**Grupo 1 — Documento principal (obrigatório)**  
- Termo / Contrato de Concessão de Bolsa

**Grupo 2 — Termos complementares**  
- Termo de contrapartida (quando houver)  
- Termo de ciência de condições da bolsa

**Grupo 3 — Termos opcionais**  
- Termo de uso de imagem

---

### 4.3 MATRÍCULA_CURSO_LIVRE

**Descrição:**  
Inscrição em curso livre, workshop ou atividade pontual.

#### Conjunto: Curso Livre

**Grupo 1 — Documento principal (obrigatório)**  
- Contrato de Curso Livre  
- Termo de adesão simplificado

**Grupo 2 — Termos opcionais**  
- Termo de uso de imagem  
- Autorização específica (quando aplicável)

---

### 4.4 VENDA_LOJA

**Descrição:**  
Venda de produto físico ou serviço pela loja da escola.

#### Conjunto: Venda Loja

**Grupo 1 — Documento principal (obrigatório)**  
- Recibo de venda  
- Comprovante de pagamento

**Grupo 2 — Documentos complementares**  
- Termo de troca/devolução (quando aplicável)

---

### 4.5 PRESTACAO_SERVICO

**Descrição:**  
Contratação de professores, coreógrafos ou prestadores externos.

#### Conjunto: Prestação de Serviço

**Grupo 1 — Documento principal (obrigatório)**  
- Contrato de Prestação de Serviços

**Grupo 2 — Termos complementares**  
- Termo de confidencialidade  
- Termo de cessão de direitos (quando aplicável)

---

## 5. Seleção de modelos dentro de um grupo

Dentro de um mesmo grupo, pode haver **mais de um modelo possível**.

Exemplos:
- Contrato padrão vs. contrato com condição especial;
- Modelo por ano de referência;
- Modelo por perfil do aluno (bolsista, pagante, etc.).

No MVP:
- a escolha pode ser **manual pelo operador**.

Evoluções futuras:
- sugestão automática;
- seleção automática por regra determinística.

---

## 6. Observações importantes

- Um documento **nunca existe sozinho**: ele sempre pertence a uma operação.
- O mesmo modelo pode ser reutilizado em operações diferentes.
- Grupos existem para **organização lógica**, não para impor ordem rígida.
- A estrutura permite crescimento sem refatorações estruturais.

---

## 7. Diretriz final

Toda nova operação criada no sistema deve:

1. ser registrada neste documento;
2. ter pelo menos um conjunto de documentos associado;
3. definir claramente seus grupos documentais.

Este documento é o **mapa oficial** entre o sistema operacional e o motor de documentos.

---

# Fim do documento
