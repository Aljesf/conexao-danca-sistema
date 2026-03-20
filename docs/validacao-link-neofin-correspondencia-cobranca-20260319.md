## Objetivo
Validar a nova regra de resolucao do link publico NeoFin para impedir abertura de URL generica ou aleatoria quando a correspondencia exata com a cobranca local nao estiver confirmada.

## Regra validada
- a UI so recebe `link_pagamento` quando `correspondencia_confirmada = true`
- a busca por `integration_identifier` deixou de aceitar billing recente sem identificador realmente presente no payload remoto
- quando a NeoFin devolve apenas URL do billing principal, a parcela validada continua apontando para o billing, mas com `tipo_correspondencia = installment` e `payment_number` preenchido
- cobrancas pagas com URL confirmada passam a ser exibidas como historico informativo, nao como segunda via ativa

## Evidencias executadas
Comandos usados em 19/03/2026 com `.env.local` carregado:

```powershell
node --import tsx -r dotenv/config -e "..."
```

Os scripts executaram leitura real de:
- `src/lib/financeiro/cobranca/resolverPagamentoExibivel.ts`
- `src/lib/neofinResolverLinkPublico.ts`
- base Supabase via `src/lib/supabase/server-admin.ts`

## Cenario A - cobranca em aberto sem correspondencia remota confirmada
Caso real auditado:
- cobranca local `#414`
- origem `FATURA_CREDITO_CONEXAO`
- `origem_id = 329`
- `neofin_charge_id = fatura-credito-conexao-329`

Resultado apos a correcao:
- `correspondencia_confirmada = false`
- `link_pagamento = null`
- `link_pagamento_validado = false`
- mensagem operacional:
  - `A URL publica nao foi liberada porque a correspondencia exata com a cobranca exibida nao foi confirmada.`

Conclusao:
- o botao da UI fica bloqueado
- o sistema nao abre mais um billing recente qualquer so porque recebeu um `integration_identifier` textual

## Cenario B - cobranca parcelada / payment_number identificado
Base real usada:
- cobranca `#370`
- billing NeoFin `38078456634432`
- payload remoto com `payments[]`
- parcela auditada: `4`

Resultado do helper `resolverLinkPublicoNeofin(...)`:
- `correspondencia_confirmada = true`
- `tipo_correspondencia = installment`
- `payment_number = 38078456634432-4`
- `origem_url = billing_oficial_neofin`
- `url_publica = https://app.neofin.com.br/pay?billing=38078456634432`
- observacao:
  - `Parcela 4 validada; a NeoFin expoe a URL publica no billing principal.`

Conclusao:
- a parcela deixou de abrir um link aleatorio
- quando a NeoFin nao fornece URL propria da parcela, a tela usa a URL oficial do billing principal, mas somente depois de validar a parcela correta

## Cenario C - cobranca ja paga
Casos reais auditados:
- cobranca `#370`
- cobranca `#377`

Resultado:
- `status_sincronizado = paid`
- `link_pagamento_validado = true`
- `segunda_via_disponivel = false`
- `link_historico_informativo = true`
- mensagem operacional:
  - `Cobranca quitada; o link validado da NeoFin ficou disponivel apenas como historico informativo.`

Conclusao:
- a UI deixa claro que o link nao e mais vendido como segunda via ativa
- o botao passa a ser rotulado como historico quando existir URL confirmada para consulta

## Cenario D - ausencia de correspondencia confirmada
Teste controlado com payload remoto real do billing `38078456634432`, mas referencias locais propositalmente divergentes:
- `identifier = fatura-credito-conexao-999999`
- `integrationIdentifier = fatura-credito-conexao-999999`

Resultado:
- `correspondencia_confirmada = false`
- `url_publica = null`
- `origem_url = indisponivel`
- `tipo_correspondencia = none`

Conclusao:
- mesmo com um payload remoto valido em memoria, a regra nova nao libera URL se a cobranca exibida nao bater exatamente com os identificadores validados

## Achado principal da auditoria
O defeito antigo vinha desta combinacao:
- `findRecentNeofinBillingByIntegrationIdentifier(...)` podia aceitar o primeiro billing recente retornado pela listagem
- o parser preenchia `integrationIdentifier` com o valor de referencia informado na chamada
- a UI ainda aceitava abrir fallback generico de `billing/{chargeId}`

Isso permitia tratar como correspondente um billing que nao provava o identificador local no payload remoto.

## Estado final
- `Abrir no NeoFin` agora depende de `link_pagamento_validado = true`
- links sem correspondencia ficam bloqueados na fatura e na governanca financeira
- a API passou a expor origem do link, tipo de correspondencia, `payment_number` e mensagem operacional
- nao houve alteracao SQL nesta tarefa
