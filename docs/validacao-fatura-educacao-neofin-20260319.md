# Validacao - Fatura Educacao / NeoFin / Fechamento Mensal

Data da validacao: 19/03/2026

## Escopo validado

- fechamento mensal canonico do Cartao Conexao Aluno por configuracao de ciclo
- reaproveitamento do mesmo servico de cobranca canonica entre fluxo automatico e fluxo manual
- resolucao de pagamento exibivel da fatura e da cobranca financeira com prioridade para dados remotos da NeoFin
- leitura operacional da fatura de educacao com cobranca canonica e auditoria tecnica recolhida

## Configuracao de ciclo confirmada

Estruturas confirmadas na base e no codigo, sem necessidade de migration nova:

- `credito_conexao_contas.dia_fechamento`
- `credito_conexao_contas.dia_vencimento`
- `credito_conexao_contas.dia_vencimento_preferido`
- `credito_conexao_configuracoes.dia_fechamento`
- `credito_conexao_configuracoes.dia_vencimento`
- `financeiro_config.dia_fechamento_faturas`
- `financeiro_config_cobranca.provider_ativo`

Arquivos mapeados na revisao:

- `src/app/api/admin/credito-conexao/configuracoes/route.ts`
- `src/app/api/financeiro/config/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/fechamento-automatico/route.ts`
- `src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts`
- `src/lib/credito-conexao/processarFechamentoAutomaticoMensal.ts`

Leitura real validada na base:

- `financeiro_config.dia_fechamento_faturas = 1`
- `credito_conexao_configuracoes.tipo_conta = ALUNO` com `dia_fechamento = 10` e `dia_vencimento = 12`

## Cenario A - fechamento automatico do mes

Validacao executada em modo seguro via `processarFechamentoAutomaticoMensal(..., dryRun: true)` com referencia de data em 19/03/2026.

Resumo do dry-run:

- contas avaliadas: `33`
- contas com acao elegivel: `31`
- periodos processados no dry-run: `0`
- erros: `0`

Exemplos retornados pelo servico:

- conta `#2` (`Cartao Conexao ALUNO`), dia de fechamento resolvido `10`, periodos `2026-01`, `2026-02` e `2026-03` marcados como `reutilizada`
- conta `#3` (`Cartao Conexao ALUNO`), dia de fechamento resolvido `10`, periodo `2026-01` como `reutilizada` e `2026-02` / `2026-03` como `processada`
- conta `#4` (`Cartao Conexao Aluno`), dia de fechamento resolvido `10`, com combinacao de `reutilizada` e `processada`

Conclusao do cenario:

- o backend ja consegue detectar, no mes novo, contas e competencias elegiveis ao fechamento mensal
- o servico respeita `dia_fechamento` por conta e fallback institucional
- o servico e idempotente no nivel de fatura/cobranca porque reutiliza fatura aberta existente e delega a cobranca para o fluxo canonico

## Cenario B - geracao manual antecipada

Validacao de paridade de codigo:

- `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `src/lib/credito-conexao/processarFechamentoAutomaticoMensal.ts`

Todos os tres caminhos chamam o mesmo servico de cobranca canonica:

- `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`

Validacao de duplicidade na base:

- consulta sobre cobrancas canonicas nao canceladas por `origem_id` retornou `0` origens com duplicidade
- total de origens canonicas avaliadas: `18`

Exemplo de fatura futura ja com cobranca canonica:

- fatura `#28`
- conta `#3`
- periodo `2026-04`
- status da fatura: `FECHADA`
- cobranca canonica: `#444`

Conclusao do cenario:

- a geracao manual antecipada passou a reutilizar o mesmo servico do fechamento automatico
- a prevencao de duplicidade fica concentrada em `getOrCreateCobrancaCanonicaFatura.ts` + `processarCobrancaCanonicaFatura.ts`
- nao foi encontrado caso duplicado no recorte auditado de cobrancas canonicas nao canceladas

## Cenario C - detalhe da fatura e detalhe da cobranca financeira

Exemplo validado na base:

- fatura `#329`
- conta `#34`
- periodo `2026-03`
- cobranca canonica `#414`
- `cobrancas.neofin_charge_id` local ainda textual: `fatura-credito-conexao-329`

Pagamento exibivel resolvido com prioridade remota:

- `tipo_exibicao = Boleto`
- `tipo_remoto = boleto`
- `status_sincronizado = paid`
- `invoice_id = 38078456634432`
- `neofin_charge_id resolvido = 38078456634432`
- `link_pagamento = https://app.neofin.com.br/pay?billing=38078456634432`
- `origem_dos_dados = remoto`
- `invoice_valida = true`
- `charge_id_textual_legado = false`

Conclusao do cenario:

- a tela da fatura nao depende mais do `charge_id` textual legado para exibir a forma de pagamento
- a cobranca financeira tambem recebe `pagamento_exibivel`, com leitura clara de invoice, link, tipo e origem dos dados
- quando a NeoFin devolver `linha_digitavel`, `barcode`, `pix_copia_cola` ou `qr_code`, o extrator central em `src/lib/neofinBilling.ts` ja esta preparado para preencher esses campos
- no exemplo auditado, a NeoFin retornou link remoto valido; `linha_digitavel`, `barcode` e `pix` permaneceram nulos porque nao vieram no payload remoto desse billing

## Defeitos confirmados e corrigidos

Tela da fatura:

- a UI ainda podia tratar um `charge_id` textual legado como se fosse invoice valida
- isso podia bloquear geracao manual mesmo sem segunda via real
- o resolver agora so marca `invoice_valida` quando existe invoice/dado remoto utilizavel ou identificador numerico valido

Detalhe da cobranca financeira:

- o `charge_id` resolvido ainda podia aparecer textual, mesmo havendo billing numerico remoto
- o resolver agora prioriza o billing numerico remoto e sinaliza legado apenas quando nao existe referencia valida melhor

## Prints e revisao visual

Pendencia real:

- a revisao visual autenticada nao foi concluida nesta validacao porque as rotas privadas dependem de sessao local valida e a captura automatica continua bloqueada por redirecionamento para `/login`

Mesmo assim, a revisao tecnica ficou registrada com:

- validacao de base real
- validacao de servico em dry-run
- validacao de cobranca canonica sem duplicidade
- validacao de resolucao de invoice e segunda via com dados remotos da NeoFin
