# Arquitetura do Modulo de Documentos

Este documento descreve a estrutura conceitual do sistema documental do Conectarte.

O modulo foi construido para separar claramente:

- autoria documental
- componentes reutilizaveis
- fluxo documental
- operacao real dos documentos

## 1. Autoria Documental

Camada onde os documentos sao criados e estruturados.

### Elementos principais

#### Modelos

Templates principais de documentos.

Exemplos:

- contrato de matricula
- recibo financeiro
- declaracao
- termos

#### Variaveis

Campos dinamicos que substituem texto no documento.

Exemplos:

- `{{ALUNO_NOME}}`
- `{{ALUNO_CPF}}`
- `{{ESCOLA_CNPJ}}`

#### Colecoes

Listas automaticas renderizadas no documento.

Exemplo:

```txt
{{#MATRICULA_ENTRADAS}}
data descricao valor status
{{/MATRICULA_ENTRADAS}}
```

## 2. Componentes Reutilizaveis

Elementos estruturais que podem ser compartilhados entre modelos.

### Cabecalhos

Identidade institucional do documento.

Exemplo:

- logo
- nome da escola
- CNPJ

### Rodapes

Elementos finais do documento.

Exemplo:

- assinatura
- local
- data

### Layouts

Estrutura visual do documento.

## 3. Fluxo Documental

Define quais documentos fazem parte de cada processo.

### Conjuntos Documentais

Agrupadores de documentos relacionados a um processo.

Exemplo:

- `MATRICULA_PAGANTE`

Documentos do conjunto:

- contrato
- ficha financeira
- recibo
- termos

### Grupos de Documentos

Organizam documentos dentro do conjunto.

Exemplo:

- DOCUMENTO PRINCIPAL
- TERMOS OBRIGATORIOS
- TERMOS OPCIONAIS

### Operacoes Documentais

Eventos que geram documentos.

Exemplo:

- `RECIBO_PAGAMENTO_CONFIRMADO`

## 4. Operacao do Sistema

Onde os documentos passam a existir de forma real.

### Documentos Emitidos

Registro oficial do documento gerado.

### PDF

Versao final renderizada.

### Reemissao

Nova versao preservando o historico.

### Historico Documental

Relacao entre versoes do documento.

## 5. Estrutura Geral do Sistema

### AUTORIA

- Modelos
- Variaveis
- Colecoes

### COMPONENTES

- Cabecalhos
- Rodapes
- Layouts

### FLUXO DOCUMENTAL

- Conjuntos
- Grupos
- Operacoes

### OPERACAO

- Documentos emitidos
- PDF
- Reemissao
- Historico

## 6. Hub de Documentos

O modulo agora possui um hub de navegacao semantico para organizar a experiencia administrativa em quatro blocos:

### Autoria

- Modelos
- Variaveis
- Colecoes

### Componentes

- Cabecalhos
- Rodapes

Entradas administrativas explicitas:

- `/admin/config/documentos/cabecalhos`
- `/admin/config/documentos/rodapes`

### Fluxos

- Conjuntos documentais

### Operacao

- Documentos emitidos

Essa organizacao reduz carga cognitiva, melhora onboarding e prepara a base para tutorial do sistema.

Este mapa serve como referencia para desenvolvimento, documentacao e treinamento do sistema.
