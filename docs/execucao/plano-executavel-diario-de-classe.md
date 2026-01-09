# 📘 PLANO EXECUTÁVEL — DIÁRIO DE CLASSE E PLANO DE AULA
Sistema Conexão Dança

Base normativa obrigatória:
docs/metodologia-plano-de-aula-e-diario-de-classe.md

====================================================
1. OBJETIVO DO MÓDULO
====================================================

Implementar no sistema o fluxo completo de:

- Planejamento pedagógico (Plano de Aula)
- Execução da aula
- Registro histórico (Diário de Classe)
- Métricas pedagógicas futuras

Separando rigorosamente:
- planejamento ≠ execução ≠ histórico

====================================================
2. ENTIDADES (SQL) — ORDEM OBRIGATÓRIA
====================================================

ETAPA SQL-1 — Planejamento
Criar tabelas:

1) planejamento_ciclos
- id
- turma_id
- titulo
- data_inicio
- data_fim
- status (RASCUNHO | APROVADO | EM_EXECUCAO | ENCERRADO)
- created_at / updated_at

2) planejamento_aulas
- id
- ciclo_id
- aula_numero (Aula #)
- intencao_pedagogica
- duracao_minutos
- status (PLANEJADA | EXECUTADA | CANCELADA)

3) planejamento_aula_blocos
- id
- aula_id
- ordem
- titulo
- objetivo
- minutos
- observacoes
- habilidades_relacionadas (FK futura)

----------------------------------------------------

ETAPA SQL-2 — Execução / Diário
Criar tabelas:

4) diario_aulas
- id
- turma_id
- aula_numero
- data_aula
- planejamento_aula_id
- status (ABERTA | FECHADA)
- professor_id
- observacoes_gerais

5) diario_frequencia
- id
- diario_aula_id
- aluno_pessoa_id
- presente (bool)
- observacao

====================================================
3. APIs (SERVER) — ORDEM
====================================================

ETAPA API-1 — Planejamento (coordenação)
Rotas:

POST   /api/academico/planejamento/ciclos
POST   /api/academico/planejamento/aulas
POST   /api/academico/planejamento/aulas/blocos
PUT    /api/academico/planejamento/aulas/:id
GET    /api/academico/planejamento/turma/:turmaId

Permissão:
- coordenação / admin

----------------------------------------------------

ETAPA API-2 — Diário (professor)
Rotas:

GET    /api/academico/diario/dia
POST   /api/academico/diario/aula
POST   /api/academico/diario/frequencia
POST   /api/academico/diario/fechar

Permissão:
- professor vinculado à turma

====================================================
4. UI / PÁGINAS (NEXT.JS)
====================================================

ETAPA UI-1 — Planejamento
Criar páginas:

src/app/(private)/academico/planejamento
src/app/(private)/academico/planejamento/turmas/[id]

Funcionalidades:
- criar ciclo
- planejar aulas
- definir Aula #
- blocos por tempo
- status do ciclo

----------------------------------------------------

ETAPA UI-2 — Diário de Classe
Criar páginas:

src/app/(private)/academico/diario
src/app/(private)/academico/diario/turma/[id]/aula/[data]

Funcionalidades:
- agenda do dia
- abrir aula
- registrar frequência
- aplicar plano
- observações
- fechar aula

====================================================
5. REGRAS DE BLOQUEIO (OBRIGATÓRIAS)
====================================================

- Aula não pode ser fechada sem frequência
- Planejamento aprovado não pode ser alterado retroativamente
- Diário fechado é imutável
- Professor não edita planejamento
- Coordenação não edita diário executado

====================================================
6. ORDEM DE EXECUÇÃO NO CODEX
====================================================

1) SQL-1 (planejamento)
2) SQL-2 (diário)
3) API-1
4) API-2
5) UI-1
6) UI-2
7) Testes manuais + prints
8) Atualizar estado-atual-do-projeto.md

====================================================
7. STATUS DO PLANO
====================================================

Estado: PRONTO PARA EXECUÇÃO NO CODEX
