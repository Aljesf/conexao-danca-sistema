# Plano de saneamento de duplicidade de cobrancas

## Criterios objetivos para decidir qual cobranca manter

- Manter a cobranca que ja possui vinculo em `public.credito_conexao_faturas`.
- Se mais de uma cobranca do grupo possuir fatura, priorizar a de origem `FATURA_CREDITO_CONEXAO` com maior aderencia ao fluxo canonico atual.
- Se nenhuma possuir fatura, priorizar a cobranca com origem mais consistente com o fluxo esperado do modulo e revisar recebimentos antes de qualquer acao.
- Em empate tecnico, revisar `origem_tipo`, `origem_id`, recebimentos, data de criacao e eventual uso por documentos antes de decidir.

## Criterios para cancelar duplicada

- Candidata a cancelamento: cobranca sem fatura em grupo onde outra cobranca equivalente da mesma pessoa, competencia e valor ja esteja vinculada a fatura.
- Candidata a cancelamento: cobranca de origem `MATRICULA` que replica uma cobranca canonica de `FATURA_CREDITO_CONEXAO` no mesmo grupo, desde que nao tenha recebimentos ou outros vinculos operacionais independentes.
- Nao cancelar automaticamente grupos com duas cobrancas vinculadas a fatura ou grupos com mais de duas cobrancas sem revisar a cadeia completa de origem.

## Casos que exigem revisao manual

- Grupos com mais de uma cobranca vinculada a fatura.
- Grupos com 3 cobrancas no mesmo conjunto duplicado.
- Grupos com `competencia_ano_mes` nula.
- Grupos em que a cobranca sem fatura tenha recebimentos, documentos emitidos ou outros rastros operacionais.
- Grupos em que `origem_tipo` e `origem_id` nao indiquem claramente qual registro nasceu do fluxo canonico.

## Hipotese provavel da causa raiz

- Ha indicio forte de geracao paralela de cobranca no fluxo de matricula e no fluxo de fechamento de fatura do Credito Conexao.
- O padrao observado sugere falta de reconciliacao entre a cobranca criada por `MATRICULA` e a cobranca canonica de `FATURA_CREDITO_CONEXAO`.
- Os grupos com duas cobrancas ja vinculadas a fatura indicam tambem possivel reprocessamento ou fechamento repetido sem bloqueio de duplicidade suficiente.
