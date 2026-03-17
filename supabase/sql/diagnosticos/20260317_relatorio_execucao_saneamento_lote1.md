# Relatorio de Execucao -- Saneamento Lote 1

## Lote executado

- IDs cancelados: 216, 258, 272, 285, 313, 412
- Criterio usado: cancelamento controlado apenas de cobrancas `MATRICULA` em grupos `MATRICULA_X_FATURA`
- Data/hora da execucao: 2026-03-17T18:42:35-03:00

## Resultado

- Cobrancas efetivamente canceladas: 6
- Grupos `MATRICULA_X_FATURA` que deixaram de ficar duplicados: pessoa_id 55, 83, 100, 102, 104 e 224
- Grupos duplicados restantes: 7

## Pendencias remanescentes

- `FATURA_DUPLA`: 6 grupos
- `TRIPLA_OU_MAIS`: 1 grupo

## Proxima etapa recomendada

- investigacao da causa raiz na API/servico de matricula e consolidacao do Cartao Conexao
