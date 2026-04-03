# Relatorio de Encerramento - Duplicidade de Cobrancas

## Problema original
- O sistema gerava cobrancas paralelas para mensalidades do Cartao Conexao: uma no fluxo de matricula e outra no fluxo canonico da fatura.

## Causa raiz
- A combinacao entre matricula e faturamento produzia duas cobrancas validas para a mesma competencia.
- Faltava coordenacao entre o legado `MATRICULA/CARTAO_CONEXAO` e a cobranca canônica `FATURA_CREDITO_CONEXAO`.

## Correcao aplicada
- A matricula deixou de gerar cobranca paralela para mensalidade do Cartao Conexao.
- A cobranca da fatura passou a usar helper canonico unico.
- Foi aplicado indice parcial unico para impedir mais de uma cobranca ativa `FATURA_CREDITO_CONEXAO` por `origem_id`.

## Saneamento executado
- Lote 1 executado anteriormente: `6` cobrancas `MATRICULA` canceladas de forma controlada.
- Lote final desta etapa: nao executado.
- Motivo: a auditoria encontrou `14` ids seguros para cancelamento, mas tambem `13` casos com recebimento e `1` caso historico sem competencia explicita, o que impede execucao integral sem ambiguidade.
- Total efetivamente cancelado ate o momento: `6` cobrancas.

## Situacao final
- A correcao estrutural do Cartao Conexao esta concluida.
- Nao existem duplicidades ativas de `FATURA_CREDITO_CONEXAO` por `origem_id`.
- Ainda existem duplicidades de dados entre legado `MATRICULA/CARTAO_CONEXAO` e cobranca canônica quando a competencia real da fatura e considerada.
- Permanecem `14` ids seguros prontos para um lote manual separado e `13` casos em revisao manual por recebimento.

## Estado do sistema apos a correcao
- O problema estrutural deixou de nascer no fluxo novo.
- O passivo historico ainda nao foi completamente encerrado no banco.
- A frente nao pode ser considerada totalmente encerrada enquanto os casos com recebimento nao tiverem decisao humana e o lote seguro nao for executado.

## Proximas recomendacoes
- Executar manualmente o lote seguro de `14` ids em janela controlada, se houver autorizacao para seguir mesmo com casos manuais pendentes.
- Abrir frente separada para migracao ou conciliacao dos `13` recebimentos legados antes de qualquer cancelamento adicional.
- Monitorar novas cobrancas `MATRICULA/CARTAO_CONEXAO` para confirmar que o problema estrutural nao volta.
- Revisar fluxos legados ainda fora do escopo que possam consultar ou depender de `cobranca_id` legado no Cartao Conexao.
