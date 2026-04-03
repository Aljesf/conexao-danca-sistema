# 📘 Contexto — Turmas

## 1. O que é o domínio

Turma é:

- unidade de execução pedagógica
- organização de alunos
- base do diário de classe

## 2. Estado atual real

Turmas possuem:

- horário
- professor
- alunos

Integração com:

- diário
- frequência
- planejamento

Problema atual:

- telas pesadas
- excesso de dados carregados
- mistura de níveis (resumo + detalhe)

## 3. Frequência

Regras corretas:

- frequência é por aula
- não é atributo fixo do aluno
- depende de:
  - turma
  - aula
  - validação

## 4. Problemas atuais

- tentativa de carregar tudo na mesma tela
- consultas pesadas
- UX confusa

## 5. Direção institucional

Separar camadas:

- Página de turmas → leve
- Página da turma → intermediária
- Aula → detalhe completo

Regra:

- aula é unidade real de consulta
- turma é hub de navegação

## 6. Regras para o Codex

- não salvar frequência como campo fixo
- não carregar todas as frequências em listagem
- usar resumo por aluno
- carregar detalhe apenas por aula
