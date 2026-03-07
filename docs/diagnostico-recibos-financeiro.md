# Diagnostico tecnico - recibos no financeiro

Data: 2026-03-07

## Situacao atual encontrada

O projeto ja possui um trilho funcional de recibos em `src/app/api/documentos/recibos/*`, mas ele ainda esta dividido em duas camadas:

- a camada financeira, que descobre pagamento, cobranca, competencia e pessoa;
- a camada Documentos, que persiste o emitido e resolve templates.

Tambem ja existem:

- modelo de recibo seeded em `supabase/migrations/20260224_01_documentos_recibo_mensalidade.sql`;
- view de busca para recibos em `public.vw_documentos_busca_recibo`;
- persistencia de documentos emitidos em `public.documentos_emitidos`.

Confirmacoes obtidas no banco real:

- existe modelo ativo de recibo em `documentos_modelo` com `id = 43` e titulo `Recibo de Pagamento de Mensalidade`;
- `recebimentos` possui eventos recentes com `data_pagamento`, `forma_pagamento_codigo` e `origem_sistema`;
- `documentos_emitidos` guarda recibos no slot legado `contrato_modelo_id`, com `status_assinatura`, `snapshot_financeiro_json` e `variaveis_utilizadas_json`;
- `conta_interna_pagamentos` nao existe no schema atual acessivel pelo Supabase REST.

O que ainda nao existe de forma fechada:

- um contrato canonico unico de snapshot de recibo;
- um motor de PDF realmente plugado para os recibos;
- uma modelagem robusta e obrigatoria para recibo mensal consolidado da conta interna.

## Eventos que hoje geram ou alimentam recibo

### 1) Recibo por pagamento de mensalidade

Arquivo principal: `src/app/api/documentos/recibos/mensalidade/route.ts`

Comportamento encontrado:

- aceita `cobranca_id` e/ou `recebimento_id`;
- busca `recebimentos` por `cobranca_id`;
- quando existe `recebimento`, usa `valor_centavos`, `data_pagamento`, `metodo_pagamento` e `forma_pagamento_codigo` como base do recibo;
- resolve `matricula_id` para ligar o recibo ao dominio Documentos;
- busca modelo em `documentos_modelo`;
- grava emitido em `documentos_emitidos`.

Conclusao:

- o recibo principal ja esta, na pratica, ancorado em pagamento confirmado;
- a cobranca funciona como referencia de negocio, nao como melhor ancora do evento financeiro.

### 2) Recibo/preview de conta interna e cobranca avulsa

Arquivos:

- `src/app/api/documentos/recibos/conta/route.ts`
- `src/app/api/documentos/recibos/preview/route.ts`
- `src/app/api/documentos/recibos/gerar-pdf/route.ts`

Comportamento encontrado:

- `COBRANCA_AVULSA`: considera pagamento confirmado quando a cobranca avulsa esta `PAGA`;
- `CONTA_INTERNA`: tenta confirmar pagamento por `conta_interna_pagamentos`, mas com fallback porque a estrutura pode nao existir;
- usa `vw_credito_conexao_fatura_itens` para compor valor mensal;
- `gerar-pdf` ainda nao gera PDF real: hoje retorna HTML quando `pagamento_confirmado = true`.

Conclusao:

- o recibo consolidado mensal ja esta mapeado conceitualmente;
- ainda nao esta pronto como fluxo principal porque depende de fonte mensal de pagamento menos robusta do que `recebimentos`;
- no ambiente atual, a tabela `conta_interna_pagamentos` nao existe, entao o consolidado mensal esta apoiado em fallback e nao em trilha canonica de pagamento.

## Fonte real dos dados do recibo

### Evento financeiro principal

Tabela: `public.recebimentos`

Justificativa:

- e o registro mais granular de confirmacao financeira encontrado no projeto;
- guarda `cobranca_id`, `valor_centavos`, `data_pagamento`, `metodo_pagamento`, `forma_pagamento_codigo`, `centro_custo_id`, `origem_sistema` e observacoes;
- a rota `POST /api/financeiro/contas-receber/receber` permite multiplos recebimentos por cobranca e calcula quitacao total por soma;
- a rota `POST /api/financeiro/cobrancas/registrar-pagamento-presencial` tambem cria `recebimentos` ao confirmar pagamento local.

Decisao desta etapa:

- recibo principal = recibo por pagamento confirmado, ancorado em `recebimentos`;
- status da cobranca sozinho nao e granular o bastante para ser a ancora canonica do recibo.

### Diferenciacao de granularidade

Pelo desenho atual:

- cobranca individual quitada:
  - quando soma dos `recebimentos.valor_centavos` atinge ou supera `cobrancas.valor_centavos`;
- recebimento parcial:
  - quando existe ao menos um `recebimento` confirmado, mas o total ainda nao quitou a cobranca;
- quitacao total:
  - quando total recebido >= valor da cobranca;
- pagamento consolidado por competencia:
  - hoje e inferido por `credito_conexao_faturas` + `vw_credito_conexao_fatura_itens`, com tentativa de confirmacao em `conta_interna_pagamentos`.

Implicacao:

- o sistema ja suporta recibo por recebimento parcial e por quitacao total, desde que o recibo seja modelado por `recebimento`;
- se houver cobranca marcada como quitada sem `recebimentos` suficientes, isso vira gap estrutural e deve ser tratado como bloqueio para recibo canonico.

## Dados minimos do snapshot de recibo

Os grupos definidos nesta etapa ficaram assim:

### A. Identificacao

- `recibo_numero`
- `data_emissao`
- `cidade_emissao`
- `tipo_recibo`

### B. Pagador / favorecido

- `pessoa_nome`
- `pessoa_documento`
- `responsavel_financeiro_nome`

### C. Referencia financeira

- `cobranca_id`
- `recebimento_id`
- `competencia_ano_mes`
- `conta_interna_tipo`
- `origem_tipo`
- `origem_referencia_label`

### D. Valores

- `valor_pago_centavos`
- `valor_total_referencia_centavos`
- `saldo_pos_pagamento_centavos`

### E. Descritivo

- `descricao`
- `observacoes`

### F. Auditoria

- `centro_custo_nome`
- `operador_nome`
- `usuario_emissor`
- `timestamp_emissao`

## Conexao com o modulo Documentos

Arquivos relevantes:

- `src/app/api/documentos/emitir/route.ts`
- `src/app/api/documentos/emitidos/route.ts`
- `src/app/api/documentos/recibos/mensalidade/route.ts`
- `src/app/api/documentos/recibos/conta/route.ts`

Decisao conceitual fechada nesta execucao:

- recibo nao deve nascer de um documento vazio;
- recibo nasce de um snapshot financeiro fechado;
- o modulo Documentos deve consumir esse snapshot pronto;
- o modulo Documentos nao deve recalcular regra financeira diretamente.

Reaproveitamento identificado:

- `documentos_modelo` para modelos e layout;
- `documentos_emitidos` para persistencia, hoje usando o slot legado `contrato_modelo_id`;
- placeholder/template engine ja existente para renderizacao;
- layouts fisicos, cabecalho e rodape devem permanecer como responsabilidade do modulo Documentos no proximo chat.

## Pontos de entrada de UI mapeados

Telas encontradas:

- `src/app/(private)/admin/governanca/cobrancas/[id]/page.tsx`
- `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- `src/app/(private)/admin/financeiro/contas-receber/page.tsx`

### Onde o botao "Gerar recibo" deve entrar

1. Detalhe de cobranca quitada

- melhor ponto para recibo individual;
- a tela ja mostra `recebimentos_resumo`;
- deve liberar recibo apenas quando houver `recebimento` confirmado ou evidencia financeira equivalente muito clara.

2. Historico de recebimentos / contas a receber

- bom ponto operacional para emitir logo apos registrar o recebimento;
- especialmente util para recebimentos parciais, porque o evento correto e o `recebimento`, nao a cobranca inteira.

3. Detalhe mensal da conta interna / fatura

- ponto natural para o recibo consolidado mensal;
- deve ficar como tipo secundario, condicionado a confirmacao mensal robusta.

### Onde evitar o botao

- cobranca pendente sem recebimento;
- cobranca cancelada;
- fatura mensal sem confirmacao financeira confiavel;
- cenarios em que a tela so conhece a cobranca, mas nao conhece o evento de pagamento.

## Diferenca entre recibo individual e consolidado

### Recibo individual

- ancora: `recebimentos.id`
- granularidade: um evento de pagamento
- suporta parcial e total
- prioridade: alta
- robustez atual: alta

### Recibo mensal consolidado

- ancora desejada: competencia da conta interna com fechamento financeiro confirmado
- granularidade: consolidado mensal por pessoa/conta
- prioridade: secundaria
- robustez atual: media/baixa porque a confirmacao mensal ainda depende de estrutura opcional

## Riscos e gaps

1. PDF ainda nao esta plugado de fato para recibos.

- `src/app/api/documentos/recibos/gerar-pdf/route.ts` ainda retorna HTML.

2. Preview de recibo usa HTML especifico e texto fixo.

- isso resolve o MVP, mas ainda nao representa a integracao plena com o motor documental.

3. Confirmacao mensal da conta interna nao e canonica o bastante.

- `conta_interna_pagamentos` nao existe no schema atual consumido pela aplicacao;
- por isso o consolidado deve ficar como tipo secundario no proximo ciclo.

4. Cobrança quitada sem `recebimentos` suficientes e um gap real.

- nesses casos o sistema nao tem trilha granular confiavel para um recibo por pagamento;
- a regularizacao deve ser financeira antes de ser documental.

## Recomendacao final

Implementacao recomendada para o proximo chat:

1. Criar builders server-side de snapshot:

- `buildReciboPagamentoSnapshot(recebimento_id)`
- `buildReciboMensalConsolidadoSnapshot(pessoa_id, competencia_ano_mes, conta_interna_tipo?)`

2. Padronizar a emissao:

- rota financeira/documental deve primeiro fechar o snapshot;
- depois entregar esse snapshot ao modulo Documentos para renderizar e persistir.

3. Tornar o recibo individual o fluxo oficial:

- entrada principal no detalhe da cobranca quitada e no historico de recebimentos.

4. Tratar o consolidado mensal como evolucao complementar:

- habilitar somente quando houver confirmacao mensal confiavel.

## Tabelas e arquivos que entram no proximo chat

### Tabelas / views

- `public.cobrancas`
- `public.recebimentos`
- `public.credito_conexao_faturas`
- `public.credito_conexao_contas`
- `public.vw_credito_conexao_fatura_itens`
- `public.documentos_modelo`
- `public.documentos_emitidos`
- `public.vw_documentos_busca_recibo`
- `public.conta_interna_pagamentos` (se existir no ambiente alvo)

### Arquivos

- `src/app/api/documentos/recibos/mensalidade/route.ts`
- `src/app/api/documentos/recibos/conta/route.ts`
- `src/app/api/documentos/recibos/preview/route.ts`
- `src/app/api/documentos/recibos/gerar-pdf/route.ts`
- `src/app/api/documentos/emitir/route.ts`
- `src/app/(private)/admin/governanca/cobrancas/[id]/page.tsx`
- `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- `src/app/(private)/admin/financeiro/contas-receber/page.tsx`
- `src/lib/documentos/recibos/contrato-recibo.ts`
