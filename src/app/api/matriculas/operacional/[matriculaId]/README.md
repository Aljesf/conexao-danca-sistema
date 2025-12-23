# API 6 — Detalhe operacional de matricula

GET `/api/matriculas/operacional/:matriculaId`

## Retorna
- `matricula` (registro completo)
- `turma_aluno` (vinculo pedagogico)
- `aluno` (pessoa)
- `responsavel_financeiro` (pessoa)
- `turma`
- `cobrancas` (pro-rata + 12 parcelas; inclui `descricao`)

## Erros
- 400: `matriculaId` invalido
- 404: matricula nao encontrada
- 500: erro interno
