# Arquitetura de Turmas, Frequencia e Aula

Data: 2026-03-20

## Decisao

- Pagina principal de turmas = listagem leve.
- Pagina da turma = tela intermediaria com alunos, resumo contextual de frequencia e aulas confirmadas.
- Pagina da aula = unidade real de detalhe operacional.

## Regras

- A pagina principal nao carrega frequencia detalhada.
- A pagina principal nao carrega alunos completos.
- A pagina principal nao depende de metricas profundas por turma para abrir.
- A pagina da turma carrega:
  - dados da turma
  - lista de alunos vinculados
  - resumo de frequencia por aluno no contexto turma↔aluno
  - lista de aulas confirmadas/validadas
- A pagina da turma nao carrega presencas detalhadas de todas as aulas.
- A frequencia detalhada so abre no contexto da aula especifica.
- A frequencia detalhada nao vira atributo fixo do aluno.
- O resumo de frequencia e contextual e calculado apenas sobre aulas confirmadas/validadas.

## Fonte canonica

- `public.turma_aulas` continua como entidade canonica da execucao real da aula.
- `public.turma_aula_presencas` continua como detalhe de frequencia por aluno.
- O detalhe operacional da aula reutiliza o fluxo canonico do Diario de Classe.

## API

- `GET /api/escola/turmas`
  - retorna apenas o necessario para a listagem leve
- `GET /api/escola/turmas/[turmaId]`
  - retorna dados da turma, alunos vinculados, resumo de frequencia por aluno e aulas confirmadas
- `GET /api/escola/turmas/[turmaId]/aulas/[aulaId]`
  - retorna dados da aula, plano/contexto executado, observacoes, avaliacoes relacionadas e frequencia detalhada

## Otimizacoes futuras

- helper server-side com agregacao limitada por turma
- view resumida por aluno/turma
- materialized view por aluno/turma quando o volume operacional justificar
