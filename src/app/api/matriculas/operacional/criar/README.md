# POST /api/matriculas/operacional/criar

## Objetivo
Criar matricula operacional completa (transacao unica):
- cria `matriculas`
- cria vinculo pedagogico em `turma_aluno`
- gera cobrancas:
  - pro-rata (opcional) — `origem_subtipo = PRORATA_AJUSTE`
  - 12 parcelas anuais — `origem_subtipo = ANUIDADE_PARCELA`

## Regras fechadas
- vencimento e fixo (contratual)
- acordo nao altera vencimento: ajusta `data_prevista_pagamento` e `data_inicio_encargos` em rotas especificas
- ao criar, default:
  - `data_prevista_pagamento = vencimento`
  - `data_inicio_encargos = vencimento`
- `multa_percentual_aplicavel` e `juros_mora_percentual_mensal_aplicavel` vem de `matricula_configuracoes` ativa
- mes comercial = 30 dias

## Payload
```json
{
  "pessoa_id": 123,
  "responsavel_financeiro_id": 456,
  "turma_id": 789,
  "ano_referencia": 2026,
  "data_matricula": "2026-02-10",
  "mes_inicio_cobranca": 2,
  "gerar_prorata": true
}
```

Resposta (201): retorna matricula, vinculo e lista basica das cobrancas criadas
(id, subtipo, vencimento, valor, parcela_numero).
