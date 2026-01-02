# 📘 Documentos — Variáveis
Sistema Conexão Dança

> **Documento subordinado ao domínio DOCUMENTOS.**  
> Este arquivo define o conceito, a governança e o uso das **Variáveis**  
> utilizadas na geração de documentos institucionais.  
>
> Documento pai obrigatório:  
> 📄 `docs/documentos/documentos-visao-geral.md`

---

## 1. Objetivo deste documento

Este documento tem como objetivo:

- definir o que são **Variáveis** no sistema;
- padronizar a criação e o uso de variáveis;
- evitar duplicações e ambiguidades;
- servir como base para contratos, recibos, termos, declarações e formulários.

Variáveis são **globais ao domínio Documentos**.

---

## 2. O que é uma Variável

Uma **Variável** é um campo reutilizável que representa um dado
que pode ser inserido automaticamente em um documento.

Ela responde à pergunta:
> “De onde vem esse dado e como ele aparece no documento?”

Uma variável:
- possui código único;
- possui descrição humana;
- possui origem definida;
- pode ou não possuir path técnico;
- pode ser usada em qualquer tipo de documento.

---

## 3. Estrutura conceitual de uma Variável

Toda variável possui:

- **Código**
  - Identificador técnico
  - Exemplo: `ALUNO_NOME`

- **Descrição**
  - Texto humano explicativo
  - Exemplo: “Nome completo do aluno”

- **Origem**
  - Define de onde o valor será obtido
  - Ex.: ALUNO, MATRÍCULA, FINANCEIRO, MANUAL

- **Tipo**
  - TEXTO, MONETARIO, DATA, NUMERICO, BOOLEANO

- **Path técnico** (quando aplicável)
  - Caminho lógico dentro do contexto de emissão

- **Formato** (opcional)
  - Ex.: BRL, DATA_CURTA, DATA_EXTENSO

---

## 4. Origens de Variáveis (oficiais)

### 4.1 ALUNO
Dados da pessoa do aluno.

Exemplos:
- `ALUNO_NOME` → `aluno.nome`
- `ALUNO_CPF` → `aluno.cpf`
- `ALUNO_DATA_NASCIMENTO` → `aluno.data_nascimento`

---

### 4.2 RESPONSAVEL_FINANCEIRO
Dados da pessoa responsável pelo pagamento.

Exemplos:
- `RESP_FIN_NOME` → `responsavel.nome`
- `RESP_FIN_CPF` → `responsavel.cpf`
- `RESP_FIN_TELEFONE` → `responsavel.telefone`

---

### 4.3 MATRÍCULA
Dados do vínculo educacional/artístico.

Exemplos:
- `MATRICULA_ANO_REFERENCIA` → `matricula.ano_referencia`
- `MATRICULA_DATA` → `matricula.data_matricula`
- `MATRICULA_STATUS` → `matricula.status`

---

### 4.4 TURMA / CURSO
Dados do curso, turma ou projeto.

Exemplos:
- `CURSO_NOME` → `turma.nome`
- `CURSO_TIPO` → `turma.tipo`
- `CURSO_HORARIO` → `turma.horario`

---

### 4.5 ESCOLA
Dados institucionais fixos.

Exemplos:
- `ESCOLA_NOME` → `escola.nome`
- `ESCOLA_CNPJ` → `escola.cnpj`
- `ESCOLA_ENDERECO` → `escola.endereco`

---

### 4.6 FINANCEIRO
Dados financeiros calculados fora do documento.

Esses valores vêm do **snapshot financeiro** da operação.

Exemplos:
- `VALOR_TOTAL_CONTRATADO` → `snapshot_financeiro.valor_total_contratado_centavos`
- `VALOR_MENSALIDADE` → `snapshot_financeiro.valor_mensalidade_centavos`
- `NUMERO_PARCELAS` → `snapshot_financeiro.numero_parcelas`

---

### 4.7 MANUAL
Dados digitados pelo operador no momento da emissão.

Exemplos:
- `DATA_DOCUMENTO`
- `CIDADE_DOCUMENTO`
- `OBSERVACOES_GERAIS`

Variáveis MANUAL **não possuem path técnico**.

---

## 5. Formatos de exibição

Variáveis podem possuir formato para exibição correta.

Exemplos:
- BRL → R$ 1.200,00
- DATA_CURTA → 12/03/2026
- DATA_EXTENSO → 12 de março de 2026

O formato **não altera o valor**, apenas a apresentação.

---

## 6. Padrão de criação de variáveis (método oficial)

Antes de criar uma variável, responder:

1. **O que é o dado?**
2. **De onde ele vem?**
3. **Qual o path técnico (se houver)?**
4. **Como ele deve aparecer no documento?**

Se essas quatro perguntas estiverem claras, a variável está correta.

---

## 7. Exemplos institucionais comuns

- `ALUNO_NOME`
- `RESP_FIN_NOME`
- `CURSO_NOME`
- `MATRICULA_ANO_REFERENCIA`
- `VALOR_TOTAL_CONTRATADO`
- `DATA_DOCUMENTO`

---

## 8. Governança de Variáveis

- Variáveis não devem ser duplicadas com significados semelhantes.
- Alterar uma variável pode impactar vários documentos.
- Novas variáveis devem ser:
  - genéricas,
  - reutilizáveis,
  - registradas neste documento.

Este documento é a **fonte oficial de governança** das variáveis.

---

## 9. Diretriz final

Variáveis são o **elo** entre:
- o sistema operacional,
- os dados reais,
- e os documentos institucionais.

Qualquer expansão do módulo Documentos deve respeitar
as definições estabelecidas neste arquivo.

---

# Fim do documento
