> ⚠️ DOCUMENTO LEGADO  
> Este arquivo descreve regras anteriores de matrícula.  
> A fonte única de verdade é:  
> Regras Oficiais de Matrícula (Conexão Dança) – v1

# API 5 - Aplicar acordo em cobranca (Matriculas)

POST `/api/matriculas/operacional/aplicar-acordo`

## Objetivo
Aplicar acordo sem mudar vencimento contratual:
- atualiza `data_prevista_pagamento`
- atualiza `data_inicio_encargos`

## Regras
- permitido apenas para cobrancas com `origem_tipo = 'MATRICULA'`
- bloqueado para ultima parcela: `parcela_numero = total_parcelas`
- `data_inicio_encargos >= data_prevista_pagamento`

## Payload
```json
{
  "cobranca_id": 123,
  "data_prevista_pagamento": "2026-03-10",
  "data_inicio_encargos": "2026-03-20"
}
```

Resposta:
- 200 com a cobranca atualizada
- 409 se for ultima parcela
