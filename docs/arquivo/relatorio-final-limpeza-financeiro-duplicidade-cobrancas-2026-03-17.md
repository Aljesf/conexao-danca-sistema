# Relatorio Final - Limpeza do Financeiro por Duplicidade de Cobrancas

## Correcao estrutural

- Matricula sem cobranca paralela para mensalidade da Conta Interna.
- Fatura com cobranca canonica unica por origem.
- Indice canonico integro e sem duplicidade ativa por `origem_id`.

## Saneamento executado

- Lote 1: `6` cobrancas canceladas.
- Lote seguro legado: `14` cobrancas canceladas.
- Lote final do passivo historico: `14` cobrancas canceladas.
- Total geral de cobrancas canceladas: `34`.

## Criterio final usado no passivo historico

- Recebimento legado prevalece quando for unico no grupo.
- Fatura prevalece quando for unica apenas na ausencia de recebimento.
- A mais antiga prevalece como fallback quando houver mais de um recebimento no grupo.
- O id `25` foi resolvido pela logica historica do grupo `59|2026-02|42000`, mantendo a cobranca mais antiga e cancelando as demais duplicadas.

## Situacao final

- Nao restou duplicidade ativa pela auditoria de competencia real.
- Nao restou duplicidade ativa canonica de `FATURA_CREDITO_CONEXAO` por `origem_id`.
- O financeiro ficou limpo do ponto de vista da duplicidade historica auditada nesta frente.

## Observacao operacional

A partir daqui, o contas a receber deve refletir melhor o valor realmente aberto, sem as duplicidades historicas auditadas nesta limpeza.
