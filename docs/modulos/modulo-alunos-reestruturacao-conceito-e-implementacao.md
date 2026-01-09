# 📘 MÓDULO ALUNOS — REESTRUTURAÇÃO CONCEITUAL E PLANO DE IMPLEMENTAÇÃO  
Sistema Conexão Dança

---

## 1. Finalidade deste documento

Este documento define o **modelo conceitual oficial** do módulo **Alunos**, bem como o **plano técnico de implementação**, servindo como:

- guia normativo para desenvolvimento;
- referência para decisões de arquitetura;
- base para o Codex durante execuções futuras.

Nenhuma implementação deve contrariar este documento sem revisão explícita.

---

## 2. Princípios fundamentais

### 2.1 Aluno não é cadastro manual

No Sistema Conexão Dança:

**Aluno não nasce por cadastro.  
Aluno nasce por vínculo acadêmico.**

Uma pessoa torna-se aluno quando:
- realiza uma matrícula, ou
- possui vínculo acadêmico válido (turma / histórico).

Consequência direta:
- Não existe entidade “Novo aluno”.
- Não existe botão ou fluxo de “criar aluno”.

---

### 2.2 Pessoa ≠ Aluno

- **Pessoa** é entidade base do sistema.
- **Aluno** é um papel/estado derivado de vínculo acadêmico.

Toda consulta a “alunos” deve partir de:
- matrículas,
- vínculos acadêmicos,
- ou regras explícitas documentadas.

---

### 2.3 Currículo não é exclusivo de aluno

O sistema deve permitir currículos para:
- alunos (currículo acadêmico),
- não-alunos autorizados (currículo institucional).

Exemplos:
- diretores,
- professores,
- artistas convidados,
- pessoas estratégicas da instituição.

---

### 2.4 Turma ≠ Grupo administrativo

- **Turma** → agrupamento pedagógico automático.
- **Grupo de alunos** → agrupamento administrativo manual.

Ambos coexistem, com propósitos distintos.

---

## 3. Estrutura oficial de rotas

Todo o domínio **Alunos** pertence ao contexto **Escola**.

### 3.1 Rotas válidas

```text
/escola/alunos
/escola/alunos/lista
/escola/alunos/curriculos
/escola/alunos/grupos
```

### 3.2 Rotas inválidas (a remover ou redirecionar)

```text
/alunos
/alunos/curriculo
```

Justificativa:

- domínio acadêmico,
- coerência de navegação,
- simplificação de ACL e manutenção.

---

## 4. Lista de alunos

### 4.1 Conceito

A Lista de Alunos exibe exclusivamente pessoas com vínculo acadêmico.

Não é:

- lista geral de pessoas,
- cadastro manual,
- base administrativa genérica.

### 4.2 Fonte canônica de dados

A lista deve ser construída a partir de:

- matrículas,
- vínculos com turmas,
- histórico acadêmico.

Views frágeis (ex.: `vw_alunos` inexistente) devem ser evitadas ou rigidamente controladas.

---

## 5. Currículos (escala real)

### 5.1 Problema a resolver

Grids extensos com cards:

- não escalam,
- geram ruído visual,
- prejudicam operação diária.

### 5.2 Novo modelo de tela

A tela de currículos funciona como localizador, não como vitrine.

Funcionalidades obrigatórias:

- busca por nome, e-mail ou telefone;
- filtros:
  - somente alunos,
  - incluir currículos institucionais;
- paginação;
- ação direta: “Abrir currículo”.

### 5.3 Regra de existência de currículo

Uma pessoa possui currículo se:

- É aluno (currículo acadêmico automático), OU
- Possui currículo institucional habilitado manualmente.

Essa regra permite currículos relevantes sem distorcer o conceito de aluno.

---

## 6. Grupos de alunos (administrativos)

### 6.1 Finalidade

Grupos servem para organização estratégica e operacional, não pedagógica.

Exemplos:

- Companhia de dança (Adulto / Mirim),
- Estágio rápido,
- Filhos de colaboradores,
- Agrupamentos temporários ou duradouros.

### 6.2 Estrutura conceitual

Grupo

- nome
- categoria
- subcategoria
- tipo: TEMPORÁRIO | DURADOURO
- ativo
- descrição (opcional)
- vigência (opcional)

Membros

- pessoa_id
- status no grupo
- data_entrada
- data_saida
- observação (opcional)

Regras:

- aluno pode participar de múltiplos grupos;
- grupos não substituem turmas.

---

## 7. Padrão visual e UX

Todas as telas do módulo Alunos devem:

- seguir layout institucional;
- usar containers e headers padronizados;
- permitir reconhecimento imediato pela equipe.

Layouts fora do padrão devem ser refatorados.

---

## 8. Plano de implementação (ordem obrigatória)

ETAPA 1 — SQL

- ajustar/remover dependência de `vw_alunos`;
- criar estrutura de grupos administrativos;
- criar suporte a currículo institucional.

ETAPA 2 — API

- listagem de alunos;
- busca de currículos;
- CRUD de grupos;
- gestão de membros.

ETAPA 3 — Páginas

- lista de alunos;
- localizador de currículos;
- gestão de grupos.

ETAPA 4 — Validação

- prints;
- testes manuais;
- revisão de UX.

ETAPA 5 — Documentação

- atualização do `estado-atual-do-projeto.md`.

---

## 9. Status do documento

Este documento é normativo e deve ser consultado antes de qualquer alteração no módulo Alunos.

Alterações futuras exigem revisão explícita deste arquivo.
