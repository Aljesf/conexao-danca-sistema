# API 7 — Encerrar matricula/vinculo (operacional)

POST `/api/matriculas/operacional/encerrar`

## Objetivo
Encerrar, em transacao unica:
- vinculo pedagogico (`turma_aluno`) associado a matricula
- matricula (`matriculas.status = 'CANCELADA'`)
- opcionalmente cancelar cobrancas futuras abertas

## Payload
```json
{
  "matricula_id": 7,
  "data_fim": "2026-06-30",
  "motivo": "Mudanca de turma / cancelamento",
  "cancelar_cobrancas_futuras": true
}
```

Resposta
200: { ok: true, matricula_id, data_fim, cancelar_cobrancas_futuras }

404: matricula nao encontrada

500: erro interno
