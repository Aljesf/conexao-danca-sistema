# 📘 API — Matrículas
Sistema Conexão Dança  
Status: Documento em adequação (alinhado às Regras Oficiais v1)  
Base normativa: **Regras Oficiais de Matrícula (Conexão Dança) – v1**  
Base técnica: **Modelo Físico — Domínio de Matrículas (Alvo)**

---

## 0. Contexto

Este documento define a API oficial do domínio de Matrículas, começando pelo endpoint:

- `POST /api/matriculas/novo`

Objetivo da rota (v2):

- Criar uma nova matrícula na tabela `matriculas` (unidade oficial do vínculo).
- Criar/garantir vínculo operacional em `turma_aluno` com `matricula_id`.
- Gerar os registros financeiros conforme as regras oficiais:
  - **Mensalidade cheia** → lançamento no **Cartão Conexão** (`credito_conexao_lancamentos`).
  - **Entrada (Pró-rata)** → cobrança direta (`cobrancas` + `recebimentos`), fora do Cartão Conexão.
  - Suportar **exceção negociável** da Entrada (adiar para vencimento) com auditoria.

Escopo (primeira entrega desta API):

- Matrículas para `REGULAR` e `CURSO_LIVRE` (vínculo em `turmas.turma_id`).
- Não cria pessoas.
- Não cria turmas.
- Não gera contrato/PDF ainda (fases futuras).
- Financeiro limitado ao necessário para:
  - Entrada (pró-rata) e
  - Lançamento da mensalidade cheia no Cartão Conexão.

---

## 1. Rota e Método

- Método: `POST`
- URL: `/api/matriculas/novo`
- Content-Type: `application/json`
- Resposta: `application/json`

Implementação prevista:
- `src/app/api/matriculas/novo/route.ts`

---

## 2. Autenticação e permissões

- Usuário autenticado (Supabase Auth).
- Roles permitidos (exemplo): `ADMIN`, `SECRETARIA`, `COORDENACAO`.
- Se não autorizado → `403`.

---

## 3. Princípios obrigatórios (API)

### 3.1 Matrícula não define vencimento financeiro

A API **não deve**:
- criar “mensalidade” em `cobrancas`;
- definir “data de vencimento” para mensalidade;
- tratar `vencimento` como campo editável da matrícula.

O vencimento financeiro real pertence ao **Cartão Conexão**.

A matrícula pode registrar apenas:
- `vencimento_padrao_referencia` (snapshot da política vigente).

### 3.2 Separação financeira

- Mensalidade cheia → `credito_conexao_lancamentos` (Cartão Conexão).
- Entrada (Pró-rata) → `cobrancas`/`recebimentos` (pagamento no ato) OU cobrança pendente quando houver exceção.

---

## 4. Payload do `POST /api/matriculas/novo`

### 4.1 Estrutura geral

```json
{
  "pessoa_id": 123,
  "responsavel_financeiro_id": 456,
  "tipo_matricula": "REGULAR",
  "vinculo_id": 789,
  "ano_referencia": 2026,
  "data_matricula": "2026-02-10",
  "data_inicio_vinculo": "2026-02-10",
  "tabela_matricula_id": 10,
  "plano_pagamento_id": 3,
  "vencimento_padrao_referencia": 12,
  "politica_primeiro_pagamento": {
    "modo": "PADRAO",
    "motivo_excecao": null
  },
  "pagamento_entrada": {
    "metodo_pagamento": "PIX",
    "valor_centavos": 25000,
    "data_pagamento": "2026-02-10",
    "observacoes": "Pago no ato."
  },
  "observacoes": "Matrícula feita na recepção."
}
```

### 4.2 Campos

Obrigatórios:

- pessoa_id (int) — pessoas.id do aluno
- responsavel_financeiro_id (int) — pessoas.id do pagador
- tipo_matricula (string) — REGULAR | CURSO_LIVRE | PROJETO_ARTISTICO (fase 1: REGULAR/CURSO_LIVRE)
- vinculo_id (int) — turmas.turma_id
- data_matricula (date) — default: hoje
- data_inicio_vinculo (date) — default: data_matricula (define 1º ciclo efetivo)

Condicionais / recomendados:

- ano_referencia (int) — obrigatório para REGULAR
- tabela_matricula_id (int) — obrigatório quando o modelo físico estiver ativo
- plano_pagamento_id (int) — opcional inicialmente (pode ser null)
- vencimento_padrao_referencia (int) — snapshot; default institucional (ex.: 12)

Bloco de política (novo):

- politica_primeiro_pagamento (opcional):
  - modo: PADRAO | ADIAR_PARA_VENCIMENTO
  - motivo_excecao: obrigatório se modo = ADIAR_PARA_VENCIMENTO

Bloco de pagamento da entrada (opcional):

- pagamento_entrada:
  - usado quando houver Entrada (Pró-rata) e pagamento no ato.
  - se modo = ADIAR_PARA_VENCIMENTO, não deve haver recebimento no ato.

---

## 5. Regras de validação (resumo)

### 5.1 Existência

- pessoa_id existe em pessoas
- responsavel_financeiro_id existe em pessoas
- vinculo_id existe em turmas

### 5.2 Duplicidade (REGULAR)

Não permitir matrícula ativa/trancada para mesma pessoa + turma + ano, conforme regra interna:

- retornar 409 com error = "matricula_duplicada".

### 5.3 Política de primeiro pagamento

Se politica_primeiro_pagamento.modo = ADIAR_PARA_VENCIMENTO:

- motivo_excecao obrigatório (não vazio)
- registrar auditoria (campos ou evento)
- Entrada (Pró-rata), quando aplicável, vira cobrança pendente com vencimento calculado, sem recebimento no ato.

### 5.4 Pró-rata

A API deve calcular a Entrada (Pró-rata) quando aplicável, conforme Regras Oficiais v1:

- Pró-rata só na primeira cobrança
- Janeiro com regra específica (início letivo parametrizável)
- Pró-rata ajusta valor, nunca vencimento
- Regra padrão (até corte = mensalidade cheia; após corte = pró-rata)

Observação: parâmetros institucionais (dia de corte, início letivo janeiro, vencimento referência) devem vir de Config Escola (fase SQL posterior).

---

## 6. Fluxo interno (alto nível)

Em transação:

- Validar permissão e payload.
- Buscar aluno/responsável/turma.
- Resolver valores (mensalidade) a partir da Tabela de Matrícula (quando já existir).
- Calcular:
  - se há mensalidade cheia a lançar,
  - se há Entrada (Pró-rata) e seu valor.
- Criar matriculas.
- Criar/garantir turma_aluno com matricula_id.

Financeiro:

- Mensalidade cheia → inserir em credito_conexao_lancamentos (origem_sistema='MATRICULA', origem_id=matriculas.id).
- Entrada (Pró-rata):
  - modo PADRAO: criar cobrancas + recebimentos (pago no ato).
  - modo ADIAR: criar cobrancas pendente com vencimento calculado; sem recebimento.

---

## 7. Respostas

### 7.1 Sucesso (201)

Retornar:

- matrícula criada
- vínculo turma_aluno
- ids financeiros criados (quando houver)
- valores calculados (mensalidade e pró-rata)

### 7.2 Erros

- 400 payload inválido
- 401 não autenticado
- 403 sem permissão
- 404 entidade não encontrada
- 409 conflito (duplicidade, etc.)
- 500 erro interno

---

## 8. Evoluções futuras

- Contratos (geração, emissão, assinatura)
- Integração completa com Tabela de Matrícula e Planos
- Matrícula de Projeto Artístico
- Integração com cobrança Neofin (faturas/boletos) via Cartão Conexão
