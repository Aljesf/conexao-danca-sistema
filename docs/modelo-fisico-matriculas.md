# 📘 Modelo Físico — Domínio de Matrículas (Alvo)
Sistema Conexão Dança  
Status: Documento físico-alvo (SQL conceitual)  
Base normativa: **Regras Oficiais de Matrícula (Conexão Dança) – v1**  
Observação: este documento NÃO é migration; é referência para as próximas etapas.

---

## 0. Objetivo

Definir o **modelo físico alvo** do domínio de Matrículas, alinhado às regras oficiais, garantindo:

- Pessoa como centro;
- Matrícula como ato contratual + financeiro;
- **Tabela de Matrícula** como fonte única de valores;
- Plano de pagamento como “como pagar” (sem valores);
- **Entrada (Pró-rata)** como cobrança no ato, fora do Cartão Conexão;
- Mensalidades cheias como lançamentos no Cartão Conexão;
- Data de início do vínculo configurável (matrícula hoje para iniciar no futuro).

---

## 1. Princípios físicos obrigatórios (v1)

1) **Valores vêm da Tabela de Matrícula**
- Nenhuma tabela de plano de pagamento deve carregar valor de mensalidade.
- Contratos não armazenam valores; referenciam Tabela de Matrícula e regras oficiais.

2) **Ciclo da mensalidade é mês-calendário**
- Cobertura: dia 1º ao último dia do mês.
- Vencimento padrão (ex.: dia 12) é **data limite**, não “fim do ciclo”.
- Vencimento é configurável em “Configurações da Escola”.

3) **Entrada (Pró-rata)**
- Quando aplicável, gera cobrança imediata (no ato) e NÃO entra no Cartão Conexão.
- Janeiro possui regra específica de período letivo (12 a 31) para cálculo do pró-rata quando aplicável.

4) **Cartão Conexão**
- Mensalidades cheias (ciclos completos) geram lançamentos no Cartão Conexão.
- Mora/juros não pertencem à matrícula; pertencem ao Cartão Conexão (motor financeiro).

5) **Matrícula exige primeira cobrança paga**
- A efetivação da matrícula depende do pagamento da primeira cobrança.
- Pode haver pagamento antecipado quando o início do vínculo for futuro (ex.: julho → agosto).

---

## 2. Entidades físicas principais

- `matriculas` (ato e vínculo oficial)
- `turma_aluno` (vínculo operacional pessoa ↔ turma, atrelado à matrícula)
- `matricula_tabelas` (Tabela de Matrícula — itens/valores por contexto)
- `matricula_tabela_itens` (itens cobrados e seus valores)
- `matricula_planos_pagamento` (como pagar; sem valores)
- Integração:
  - `credito_conexao_lancamentos`, `credito_conexao_faturas` (Cartão Conexão)
  - `cobrancas`, `recebimentos` (cobrança direta/entrada no ato e outras situações fora do cartão)

---

## 3. Tabela `matriculas` (canônica)

Papel: unidade oficial que vincula Pessoa, Responsável Financeiro, Produto/Vínculo e parâmetros de cobrança.

Campos físicos recomendados (conceito):

- `id` (PK)
- `pessoa_id` (FK → `pessoas.id`) — aluno
- `responsavel_financeiro_id` (FK → `pessoas.id`)
- `tipo_matricula` (enum/text com CHECK): `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`
- `vinculo_id` (FK principal do destino pedagógico)
  - v1: para REGULAR/CURSO_LIVRE aponta para `turmas.turma_id`
  - (futuro) PROJETO_ARTISTICO aponta para entidade de projeto
- `ano_referencia` (int; obrigatório para REGULAR)
- `status` (enum/text com CHECK): `ATIVA`, `TRANCADA`, `CANCELADA`, `CONCLUIDA`
- `data_matricula` (date) — data do ato
- `data_inicio_vinculo` (date) — **início das aulas** (configurável)
- `data_encerramento` (date; opcional)
- `tabela_matricula_id` (FK → `matricula_tabelas.id`) — fonte única de valores
- `plano_pagamento_id` (FK → `matricula_planos_pagamento.id`) — apenas “como pagar”
- `vencimento_dia_padrao` (int; opcional)
  - Observação: pode ser redundante para “congelar” a regra aplicada no ato, caso a configuração mude no futuro.
- `observacoes` (text)
- auditoria: `created_at`, `updated_at`, `created_by`, `updated_by`

Índices/constraints recomendadas:
- índice por `pessoa_id`, `responsavel_financeiro_id`, `status`, `tipo_matricula`, `ano_referencia`, `vinculo_id`
- para REGULAR: impedir duplicidade ativa por (pessoa_id, vinculo_id, ano_referencia) com status não cancelado.

---

## 4. Tabela `matricula_tabelas` (Tabela de Matrícula)

Papel: definir oficialmente itens e valores aplicáveis à matrícula.

Campos recomendados:
- `id` (PK)
- `produto_tipo` (text/enum): `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO` (ou equivalente)
- `referencia_tipo` (text): `TURMA` | `PRODUTO` | `PROJETO` (v1 pode focar em TURMA/PRODUTO)
- `referencia_id` (bigint) — ex.: turma_id quando referencia_tipo = TURMA
- `ano_referencia` (int) — obrigatório em REGULAR
- `titulo` (text) — nome exibido
- `ativo` (bool)
- auditoria: created/updated

Regra:
- Valores e itens são definidos em `matricula_tabela_itens`.
- A matrícula sempre aponta para uma tabela vigente (`tabela_matricula_id`).

---

## 5. Tabela `matricula_tabela_itens` (itens e valores)

Campos recomendados:
- `id` (PK)
- `tabela_id` (FK → `matricula_tabelas.id`)
- `codigo_item` (text/enum) — ex.: `MENSALIDADE`, `MATERIAL`, `FIGURINO`, etc.
- `descricao` (text)
- `tipo_item` (text/enum): `RECORRENTE`, `UNICO`, `EVENTUAL`
- `valor_centavos` (int) — valor do item (fonte única)
- `ativo` (bool)
- `ordem` (int)

Regra:
- Mensalidade recorrente deve existir para REGULAR quando aplicável.
- Entrada (Pró-rata) não é item da tabela; é cálculo operacional sobre a mensalidade do ciclo.

---

## 6. Tabela `matricula_planos_pagamento` (como pagar; sem valores)

Campos recomendados:
- `id` (PK)
- `titulo` (text)
- `periodicidade` (text/enum): `MENSAL`, `TRIMESTRAL`, `AVISTA`, etc.
- `numero_parcelas` (int; opcional)
- `permite_prorata` (bool) — regra de aplicação (modelo A)
- `ativo` (bool)

Regra:
- Este plano não possui valores.
- Valores e itens sempre vêm da Tabela de Matrícula.

---

## 7. Integração com Cartão Conexão (Crédito Conexão)

### 7.1 Mensalidades cheias → Cartão Conexão
- Para cada ciclo mensal completo, criar `credito_conexao_lancamento`:
  - `origem_sistema = 'MATRICULA'`
  - `origem_id = matriculas.id`
  - `descricao` e `valor_centavos` (da mensalidade)
  - `status = PENDENTE_FATURA`

### 7.2 Entrada (Pró-rata) → fora do Cartão Conexão
- Entrada (Pró-rata) deve gerar cobrança/recebimento imediato:
  - cria registro em `cobrancas` com `origem_tipo = 'MATRICULA_ENTRADA'` e `origem_id = matriculas.id`
  - registra `recebimentos` no ato
  - não cria lançamento no Cartão Conexão

---

## 8. Integração com `cobrancas` e `recebimentos`

Uso recomendado:
- `cobrancas` e `recebimentos` representam cobranças e pagamentos diretos fora do cartão.
- Entrada (Pró-rata) e itens avulsos pagos no ato são os casos mais comuns.

Campos existentes relevantes:
- `cobrancas.origem_tipo`, `cobrancas.origem_id` devem referenciar matrícula/entrada/itens avulsos.
- `recebimentos` registra o pagamento no ato.

---

## 9. Regra específica de janeiro (suporte físico)

Janeiro tem regra operacional específica para pró-rata:
- Período letivo inicia em 12/01
- Pró-rata de janeiro, quando aplicável, considera apenas o intervalo 12–31.

Recomendação física:
- Registrar parâmetros do calendário letivo em tabela de configuração (ex.: `escola_config_financeiro` ou `periodos_letivos`), para não “fixar” datas em código.
- O modelo físico deve permitir parametrizar:
  - `dia_inicio_letivo_janeiro` (ex.: 12)
  - `dia_vencimento_padrao` (ex.: 12)

---

## 10. Tabela `turma_aluno` (vínculo operacional)

- Deve manter `matricula_id` preenchido para matrículas REGULAR/CURSO_LIVRE.
- Deve ter FK explícita `aluno_pessoa_id` → `pessoas.id`.
- Deve ter FK `matricula_id` → `matriculas.id`.

---

## 11. Observações finais

- Este modelo físico deve ser lido em conjunto com:
  - `matricula-regras-oficiais-v1.md` (normativo)
  - `modelo-de-matriculas.md` (manual operacional)
  - `credito-conexao-v1.0.md` (motor financeiro do Cartão Conexão)
- As migrations SQL serão geradas depois, em etapa própria (Fluxo: SQL → API → Páginas → Prints → Ajustes).

Fim do conteúdo.

Regras:
- Não alterar outros arquivos.
- Apenas substituir o conteúdo do arquivo alvo.
