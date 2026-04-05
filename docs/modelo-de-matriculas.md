# Modelo de Matriculas — Manual Operacional (Conexao Danca)

## 1. Introducao

Este documento e um **manual operacional** para uso interno (balcao/administrativo).
Ele **nao cria regras novas** e **nao substitui** a fonte normativa oficial.

Fonte unica de verdade:
**Regras Oficiais de Matricula (Conexao Danca) – v1**

Em caso de conflito, prevalece o documento oficial.

---

## 2. Conceitos operacionais (resumo rapido)

- **Ciclo de cobranca (mensalidade):** mes-calendario (dia 1º ao ultimo dia do mes).
- **Vencimento padrao:** dia 12 (configuravel). O vencimento e a data limite de pagamento; nao define o ciclo.
- **Tabela de Preços — Cursos (Escola):** define itens e valores.
- **Plano de Pagamento:** define a organizacao temporal do compromisso financeiro (cobrancas), nunca o valor. No MVP, e declarativo e nao gera cobrancas/recebimentos.
- **Conta Interna:** motor financeiro central (vencimento efetivo, mora, multa e juros).

---

## 3. Fluxo operacional da matricula

1) Selecionar o aluno
- Confirmar dados basicos (nome, documento, contato).
- Confirmar responsavel financeiro quando aplicavel.

2) Selecionar o produto educacional
- Definir o tipo de produto (curso regular, projeto artistico, workshop ou outro aprovado).

3) Selecionar a turma (quando aplicavel)
- A turma define dias, horarios, professores e local.
- A turma **nao** e o objeto comercial da matricula, mas pode influenciar o valor via Tabela de Preços — Cursos (Escola).

4) Definir data de inicio do vinculo (inicio das aulas)
- A data de inicio do vinculo define o **primeiro ciclo efetivo de aulas**.
- Essa data define qual sera a primeira cobranca (mensalidade cheia ou entrada pro-rata).

5) Confirmar Tabela de Preços — Cursos (Escola)
- Os valores **vem exclusivamente** da Tabela de Preços — Cursos (Escola).
- O plano de pagamento **nao** define valores.

6) Confirmar Plano de Pagamento (MVP)
- Define a organizacao temporal do compromisso financeiro (cobrancas).
- Nao executa pagamento e nao gera cobrancas/recebimentos neste MVP.

7) Confirmar forma de liquidacao
- A Conta Interna e o motor financeiro central.
- A operacao deve respeitar as Regras Oficiais de Matricula (v1).

8) Concluir matricula
- Conferir dados finais.
- Registrar a matricula e executar o fluxo financeiro conforme as regras oficiais.

---

## 4. Primeira cobranca (regra operacional)

A primeira cobranca e obrigatoria no ato da matricula, correspondente ao **primeiro ciclo efetivo de aulas**, conforme a data de inicio do vinculo.

### 4.1 Regra geral (fevereiro a dezembro)

- Matricula realizada **ate o dia 12** do mes:
  - gera **mensalidade cheia** do mes vigente (ciclo do mes inteiro).
- Matricula realizada **apos o dia 12** do mes:
  - gera **Entrada (Pro-rata)** proporcional do dia da matricula ate o ultimo dia do mes;
  - a mensalidade cheia inicia-se no mes subsequente.

### 4.2 Regra especifica de janeiro

- O periodo letivo de janeiro inicia-se no dia 12.
- O pro-rata de janeiro, quando aplicavel, considera apenas os dias letivos de 12 a 31.

Matriculas em janeiro:
- de 1 a 12:
  - mensalidade cheia de janeiro, vencimento padrao no dia 12, lancada na Conta Interna.
- apos 12:
  - Entrada (Pro-rata de Janeiro) proporcional aos dias letivos restantes, paga no ato.

### 4.3 Regra de ouro (anti-duplicidade)

- A primeira cobranca **sempre** corresponde ao primeiro ciclo efetivo de aulas.
- **Nunca** se cobra mensalidade cheia e pro-rata no mesmo ciclo mensal.

---

## 5. Cobrancas e Conta Interna

### 5.1 O que vai para a Conta Interna

- Mensalidades cheias (ciclos completos).
- Itens da Tabela de Preços — Cursos (Escola) que forem configurados para seguir o fluxo regular na Conta Interna (ex.: itens recorrentes do curso).

### 5.2 O que nao vai para a Conta Interna

- Entrada (Pro-rata) e Entrada (Pro-rata de Janeiro).
- A Entrada e paga **no ato** e **nao integra** a Conta Interna.

### 5.3 Multa, juros e vencimento

- A Conta Interna define vencimento efetivo, mora, multa e juros.
- A matricula **nao** calcula multa ou juros.

---

## 6. Tabela de Preços — Cursos (Escola)

- A Tabela de Preços — Cursos (Escola) define **quais itens** serao cobrados e **os valores**.
- A Tabela de Preços — Cursos (Escola) define apenas itens e valores. Não define pagamento, parcelamento, vencimento, pró-rata, juros ou forma de liquidação.
- Ela substitui qualquer conceito anterior de "servico".
- O plano de pagamento **nao** define valores.

Observacao operacional:
- Itens adicionais (ex.: material, figurino, etc.) tambem vem da Tabela de Preços — Cursos (Escola).
- Esses itens nao devem ser confundidos com Entrada (Pro-rata).

---

## 7. Plano de Pagamento (MVP)

- Funcao: definir organizacao temporal do compromisso financeiro (cobrancas).
- Nao executa pagamento e nao gera cobrancas/recebimentos neste MVP.

Campos:
- nome
- ativo
- ciclo_cobranca:
  - COBRANCA_UNICA
  - COBRANCA_EM_PARCELAS (exige numero_parcelas)
  - COBRANCA_MENSAL (exige termino_cobranca)
- numero_parcelas (obrigatorio quando ciclo_cobranca = COBRANCA_EM_PARCELAS)
- termino_cobranca:
  - FIM_TURMA_CURSO
  - FIM_PROJETO
  - FIM_ANO_LETIVO
  - DATA_ESPECIFICA
- data_fim_manual (obrigatorio quando termino_cobranca = DATA_ESPECIFICA)
- regra_total_devido:
  - PROPORCIONAL
  - FIXO
- permite_prorrata (bool)
  - pro-rata afeta apenas a primeira cobranca (valor), nunca a contagem de cobrancas
- ciclo_financeiro:
  - MENSAL
  - BIMESTRAL
  - TRIMESTRAL
  - SEMESTRAL
  - ANUAL
- forma_liquidacao_padrao (declarativa; nao executa pagamento)
  - exemplos: CARTAO_CONEXAO, PIX, BOLETO, OUTRA

Regra FIM_ANO_LETIVO:
- data_termino = 31/12 do ano_referencia
- fonte preferencial: matriculas.ano_referencia (REGULAR)
- fallback: ano(data_inicio_vinculo) quando necessario

Referencias da matricula (MVP):
- escola_tabela_preco_curso_id
- plano_pagamento_id
- forma_liquidacao_padrao
- contrato_modelo_id

---

## 8. Casos especiais

### 8.1 Matricula com inicio futuro (pagamento antecipado)

Exemplo: matricula em julho com inicio em agosto.

- A data de inicio do vinculo define o primeiro ciclo efetivo (agosto).
- A primeira cobranca deve refletir esse primeiro ciclo (mensalidade cheia de agosto), paga no ato como pagamento antecipado.
- As cobrancas seguintes entram no fluxo normal da Conta Interna.

### 8.2 Matricula em janeiro

- Seguir a regra especifica do mes de janeiro (ate e apos dia 12).
- Entrada de janeiro (pro-rata) e paga no ato quando aplicavel.

---

## 9. Observacoes finais

- Este documento e um **manual operacional** e nao cria regras.
- Em caso de duvida, consultar:
  **Regras Oficiais de Matricula (Conexao Danca) – v1**
- Qualquer conflito deve ser resolvido com base no documento oficial.
