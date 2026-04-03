# Governanca de Atualizacao Documental - Sistema Conexao Danca

## 1. Objetivo

Garantir que toda evolucao relevante do sistema tenha reflexo obrigatorio na documentacao oficial.

Esta regra existe para impedir que:

- o codigo evolua e a documentacao fique para tras
- novos chats usem contexto desatualizado
- o Codex altere arquitetura, nomenclatura ou dominio sem atualizar a camada `_contexto`
- decisoes estruturais fiquem apenas em conversa e nao virem referencia permanente

## 2. Regra de ouro

Toda evolucao relevante do sistema deve atualizar documentacao no mesmo ciclo de trabalho.

Nao existe etapa concluida de verdade se a mudanca relevante nao foi refletida nos documentos adequados.

## 3. O que e considerado evolucao relevante

Sao consideradas evolucoes relevantes, entre outras:

### 3.1 Mudanca de arquitetura

Exemplos:

- dividir um contexto em dois
- mover modulos entre contextos
- criar novo dominio
- mudar hierarquia de navegacao
- separar operacao academica de operacao comercial

### 3.2 Mudanca de nomenclatura institucional

Exemplos:

- nome oficial de um modulo
- nome de um vinculo institucional
- nome de um fluxo financeiro
- mudanca de linguagem de negocio em UI e documentos

### 3.3 Mudanca de regra estrutural

Exemplos:

- mudanca no papel da matricula
- mudanca no papel da turma
- mudanca na funcao da conta interna
- mudanca na relacao entre documento e financeiro

### 3.4 Mudanca de implementacao que altera leitura do dominio

Exemplos:

- pagina principal deixa de ser detalhe e vira hub
- detalhe passa para outra rota
- fluxo operacional muda de lugar
- nova separacao entre telas leves e telas profundas

## 4. Atualizacao documental minima obrigatoria

Sempre que houver evolucao relevante, atualizar no minimo:

- `docs/estado-atual-do-projeto.md`
- pelo menos um arquivo em `docs/_contexto/`
- quando necessario, `docs/_contexto/README.md`

## 5. Regra por tipo de mudanca

### 5.1 Mudanca de dominio

Atualizar:

- `estado-atual-do-projeto.md`
- arquivo do dominio correspondente em `_contexto`

Exemplos:

- financeiro -> `04-financeiro.md`
- matriculas -> `05-matriculas.md`
- turmas -> `06-turmas.md`
- loja/cafe -> `07-loja-cafe.md`
- documentos -> `08-documentos.md`

### 5.2 Mudanca transversal

Atualizar:

- `00-visao-geral.md`
- `02-mapa-documental.md`
- `03-leitura-rapida-do-sistema.md`
- `estado-atual-do-projeto.md`

### 5.3 Mudanca de nomenclatura institucional

Atualizar:

- `01-nomenclatura-oficial.md`
- arquivos de dominio impactados
- `estado-atual-do-projeto.md`

## 6. Regra especifica para criacao ou divisao de contextos

Se um contexto for:

- dividido
- renomeado
- reorganizado
- deslocado para outro agrupamento institucional

e obrigatorio atualizar:

- `00-visao-geral.md`
- `02-mapa-documental.md`
- arquivo(s) de dominio impactado(s)
- `estado-atual-do-projeto.md`

Exemplo:

Se `Escola` for dividida em:

- contexto academico
- contexto matricula/captacao/comercial

essa mudanca deve ser registrada explicitamente na camada `_contexto`.

## 7. Regra para o Codex

Sempre que uma tarefa mexer em estrutura relevante do sistema, o Codex deve considerar a etapa "Atualizacao documental" como obrigatoria no fechamento.

O fluxo correto passa a ser:

- SQL
- API
- Paginas / Componentes
- Prints e revisao
- Ajustes
- Atualizacao documental obrigatoria
- Atualizacao do `estado-atual-do-projeto.md`

Se a tarefa nao exigir SQL/API/UI, ainda assim deve haver atualizacao documental quando houver mudanca relevante de leitura do sistema.

## 8. Regra de fechamento de etapa

Uma etapa so pode ser considerada realmente concluida quando:

- a implementacao estiver pronta
- a validacao tiver sido feita
- a documentacao correspondente tiver sido atualizada

Sem isso, a etapa esta tecnicamente incompleta.

## 9. Diretriz final

A camada `_contexto` nao e estatica.
Ela deve evoluir junto com o sistema.

O projeto deve crescer com:

- codigo atualizado
- arquitetura atualizada
- documentacao atualizada
- contexto atualizado
