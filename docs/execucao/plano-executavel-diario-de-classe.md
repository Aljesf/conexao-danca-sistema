# 📘 Metodologia Pedagógica — Plano de Aula e Diário de Classe

## Sistema Conexão Dança — Base Fundacional (Nomenclatura Padronizada)

> Este documento define a **metodologia pedagógica oficial** do Sistema Conexão Dança,
> com **nomenclatura institucional padronizada**, servindo como:
>
> * base metodológica da escola;
> * referência única para implementação técnica (SQL / API / UI);
> * documento vivo para evolução pedagógica, sem contradições futuras.

---

## 0. Glossário Oficial do Domínio Pedagógico (OBRIGATÓRIO)

Este glossário é **normativo**. Os termos abaixo devem ser usados
no sistema, nos documentos e nas implementações técnicas.

| Termo Institucional                  | Uso Correto              | Observações                         |
| ------------------------------------ | ------------------------ | ----------------------------------- |
| **Diário de Classe**                 | Nome institucional geral | Termo visível no sistema            |
| **Diário do Dia Letivo**             | Visão agregada por data  | Agenda pedagógica do dia            |
| **Sessão Pedagógica**                | Unidade executada        | Turma + data (tabela `turma_aulas`) |
| **Plano de Aula Pedagógico**         | Planejamento antecipado  | Criado em reuniões                  |
| **Plano de Aula – Modelo**           | Template reutilizável    | Parte da trilha                     |
| **Plano de Aula da Sessão**          | Plano aplicado à aula    | Instância executada                 |
| **Execução do Plano de Aula**        | Registro do que ocorreu  | Histórico imutável                  |
| **Ciclo de Planejamento Pedagógico** | Bloco de planejamento    | Ex.: 2–3 semanas                    |
| **Trilha Pedagógica da Turma**       | Sequência única          | Aula #1..#N                         |
| **Mapa Pedagógico**                  | Referência normativa     | O que deve ser ensinado             |
| **Aula #**                           | Posição pedagógica       | Não apenas cronológica              |

---

## 1. Princípios Fundamentais

### 1.1 Planejamento não acontece no dia da aula

O **Plano de Aula Pedagógico** **não é criado no momento da execução**.
Ele é resultado de **reuniões pedagógicas periódicas**, organizadas em ciclos.

A **Sessão Pedagógica** executa o que foi planejado.
O **Diário de Classe** registra e audita — nunca decide conteúdo macro.

---

### 1.2 Separação obrigatória de responsabilidades

* **Coordenação Pedagógica**

  * define cursos, níveis, módulos e habilidades;
  * constrói trilhas e ciclos de planejamento;
  * aprova planos de aula pedagógicos;
  * analisa métricas de cobertura e lacunas.

* **Professor**

  * executa o plano definido;
  * registra frequência;
  * faz observações pedagógicas;
  * pode ajustar **apenas a Sessão Pedagógica**, sem alterar o planejamento base.

---

## 2. Estrutura Pedagógica Oficial

### 2.1 Hierarquia pedagógica

1. Curso
2. Nível pedagógico (um ou mais por turma)
3. Módulos
4. Habilidades
5. **Mapa Pedagógico**
6. **Trilha Pedagógica da Turma**
7. **Ciclos de Planejamento Pedagógico**
8. **Plano de Aula – Modelo (Aula #)**
9. **Sessão Pedagógica (Diário da Aula)**

---

### 2.2 Mapa Pedagógico (referência normativa)

Cada curso e nível possui um **Mapa Pedagógico**, que define:

* módulos existentes;
* habilidades por módulo;
* habilidades obrigatórias;
* habilidades desejáveis;
* habilidades avançadas.

O Mapa Pedagógico representa **o que deve ser ensinado**.
Ele é o gabarito contra o qual o sistema mede planejamento, execução e cobertura.

---

## 3. Planejamento do Período Letivo

### 3.1 Planejamento automático de aulas

Quando uma turma possui:

* período letivo definido;
* grade de horários (dias da semana + início/fim);
* calendário escolar aplicado;

O sistema consegue determinar automaticamente:

* todas as datas válidas de aula;
* o número total de sessões previstas;
* a sequência fixa: **Aula #1 … Aula #N**.

Enquanto a grade não for alterada, essa sequência permanece estável.

---

### 3.2 Replanejamento

Se houver mudança de:

* dias da semana;
* horários;
* calendário escolar;

O sistema:

* recalcula apenas as sessões futuras;
* preserva sessões já executadas e fechadas.

---

## 4. Aula # como Posição Pedagógica

A **Aula #** não é apenas cronológica.
Ela representa uma **posição pedagógica dentro da Trilha da Turma**.

Exemplo:

* Aula #5 não é “a quinta data”;
* é o quinto momento pedagógico planejado da jornada formativa.

---

## 5. Trilha Pedagógica da Turma

### 5.1 Trilha única por turma

Cada turma possui **uma única Trilha Pedagógica ativa**, mesmo que:

* envolva múltiplos níveis;
* envolva múltiplos módulos.

A trilha define:

* o que será trabalhado em cada Aula #;
* quais módulos e habilidades entram em cada aula.

---

### 5.2 Turmas com níveis mistos

Turmas mistas **não possuem planos paralelos**.
Elas possuem:

* um plano único;
* diferenciações pedagógicas internas nos blocos da aula.

---

## 6. Ciclos de Planejamento Pedagógico

### 6.1 Definição

Um Ciclo de Planejamento representa um bloco temporal de planejamento, por exemplo:

* próximas 2 semanas;
* próximas 3 semanas;
* um mês;
* um bloco do período letivo.

O ciclo define:

* quais Aulas # serão planejadas;
* quais módulos e habilidades serão abordados.

---

### 6.2 Estados do ciclo

* Rascunho
* Aprovado
* Em execução
* Encerrado

---

## 7. Plano de Aula

### 7.1 Natureza do Plano de Aula Pedagógico

O Plano de Aula Pedagógico é:

* pré-definido;
* estruturado;
* versionável;
* associado a uma Aula # da trilha.

Ele **não nasce na Sessão Pedagógica**.
Ele é **aplicado** à Sessão no dia da execução.

---

### 7.2 Duração herdada da grade

A duração da aula:

* é definida pelo horário da grade (início/fim);
* pode variar (50 min, 60 min, 90 min etc.).

O Plano de Aula **herda automaticamente** essa duração.

---

### 7.3 Estrutura por tempo

A aula é dividida em **blocos** e **sub-blocos**, cada um com:

* objetivo pedagógico;
* minutagem (mínima / ideal / máxima);
* instruções;
* sugestão de música ou playlist;
* habilidades associadas.

---

## 8. Intenção Pedagógica da Aula

Cada Aula # possui uma **Intenção Pedagógica dominante**, como:

* técnica;
* expressiva;
* física;
* musical;
* disciplinar;
* avaliativa.

Essa intenção orienta o equilíbrio pedagógico ao longo do período.

---

## 9. Níveis de Abordagem da Habilidade

Uma habilidade pode ser trabalhada em níveis diferentes:

* Introdução
* Prática
* Reforço
* Consolidação

O sistema deve registrar **como** a habilidade foi abordada,
não apenas **se** foi abordada.

---

## 10. Diário de Classe — Duas Camadas

### 10.1 Diário do Dia Letivo

Visão agregada por data, contendo:

* turmas com aula no dia;
* professores previstos;
* status das sessões;
* pendências (ex.: chamada não fechada).

Função: **orquestração e cobrança operacional**.

---

### 10.2 Sessão Pedagógica (Diário da Aula)

Visão por turma + data, contendo:

* frequência;
* plano de aula da sessão;
* observações pedagógicas;
* fechamento da aula.

Função: **execução e registro histórico imutável**.

---

## 11. Validação da Aula

Uma Sessão Pedagógica só é considerada válida quando:

* a chamada está **FECHADA**;
* (opcional) o plano está marcado como **CONCLUÍDO**.

---

## 12. Métricas Pedagógicas

O sistema deve ser capaz de responder:

* quais módulos já foram abordados;
* quais habilidades já foram trabalhadas;
* quais ainda estão pendentes;
* quantas vezes uma habilidade foi reforçada;
* cobertura pedagógica por:

  * turma;
  * nível;
  * curso.

---

## 13. Princípios de Governança

* Planejamento não altera o passado;
* Execução não altera o planejamento;
* Histórico é imutável;
* Toda ação relevante é auditável.

---

## 14. Evolução Prevista

Este modelo permite evoluir para:

* relatórios pedagógicos avançados;
* acompanhamento individual do aluno;
* indicadores de desempenho por habilidade;
* reutilização da metodologia em escala.

---

> Este documento é a **base normativa oficial** do domínio pedagógico.
> Ele deve ser expandido com dados reais, exemplos e regras específicas
> durante a implementação técnica e o uso do sistema.
