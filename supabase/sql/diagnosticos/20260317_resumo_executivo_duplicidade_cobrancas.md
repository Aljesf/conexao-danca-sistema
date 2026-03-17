# Resumo Executivo -- Duplicidade de Cobrancas

## Numeros consolidados

- Grupos duplicados: 13
- Cobrancas envolvidas: 27
- Grupos `MATRICULA_X_FATURA`: 6
- Grupos `FATURA_DUPLA`: 6
- Grupos `TRIPLA_OU_MAIS`: 1
- Grupos com `competencia_ano_mes` nula: 13

## Hipotese principal da causa raiz

Ha indicio forte de sobreposicao entre a geracao de cobranca no fluxo de matricula e a geracao da cobranca canonica da fatura do Cartao Conexao. O padrao dominante sugere que a mensalidade originada em matricula deveria ser consolidada como lancamento/fatura, e nao coexistir como cobranca paralela no mesmo valor para a mesma pessoa.

## Criterio sugerido de saneamento

- Manter a cobranca vinculada a fatura nos casos `MATRICULA_X_FATURA`.
- Revisar manualmente grupos com duas cobrancas `FATURA_CREDITO_CONEXAO`.
- Revisar manualmente grupos triplos antes de qualquer cancelamento.

## Proxima etapa recomendada

- Gerar script SQL de saneamento controlado, ainda com criterios conservadores.
- Revisar a API ou servico que cria cobranca em `MATRICULA`.
- Revisar o fluxo de geracao e consolidacao de `FATURA_CREDITO_CONEXAO`.
