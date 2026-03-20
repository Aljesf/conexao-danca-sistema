## Modulo atual
Conta interna do aluno - fatura, pagamento NeoFin e fechamento mensal canonico

## SQL concluido
- nenhuma migration nova foi criada neste ciclo
- a estrutura existente foi validada como suficiente para o fechamento mensal configuravel:
  - `credito_conexao_contas.dia_fechamento`
  - `credito_conexao_contas.dia_vencimento`
  - `credito_conexao_contas.dia_vencimento_preferido`
  - `credito_conexao_configuracoes.dia_fechamento`
  - `credito_conexao_configuracoes.dia_vencimento`
  - `financeiro_config.dia_fechamento_faturas`
  - `financeiro_config_cobranca.provider_ativo`
- permanecem ativos os diagnosticos ja criados:
  - `supabase/sql/diagnosticos/20260319_auditoria_centro_custo_dashboard.sql`
  - `supabase/sql/diagnosticos/20260319_diagnostico_neofin_cartao_conexao.sql`

## APIs concluidas
- `src/lib/credito-conexao/processarFechamentoAutomaticoMensal.ts`
- `src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/fechamento-automatico/route.ts`
- `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`
- `src/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura.ts`
- `src/lib/financeiro/cobranca/resolverPagamentoExibivel.ts`
- `src/lib/neofinBilling.ts`
- `src/lib/neofinClient.ts`
- `src/lib/financeiro/cobranca/providers/neofinProvider.ts`
- `src/app/api/credito-conexao/faturas/[id]/route.ts`
- `src/app/api/governanca/cobrancas/[id]/route.ts`
- `src/app/api/governanca/cobrancas/[id]/sincronizar-neofin/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- `src/app/(private)/admin/governanca/cobrancas/[id]/page.tsx`
- a etapa anterior do dashboard financeiro permanece consolidada com:
  - drill-down dos cards e competencias
  - exclusao de cancelados/expurgados da composicao principal
  - competencias futuras por lancamentos ja gerados
  - leitura rapida reposicionada
  - cards de saude imediata
  - exportacao Excel nos modais e no topo do header
  - melhoria visual e operacional dos modais
  - ajuste do bloco de centro de custo

## O que foi consolidado neste ciclo
- a fatura da conta interna virou tela operacional final, com hierarquia visual clara, cabecalho util, card de pagamento, card da cobranca oficial da fatura, lancamentos legiveis e auditoria tecnica recolhivel
- a leitura de pagamento da fatura passou a priorizar a cobranca canonica e os dados remotos da NeoFin, sem depender do `charge_id` textual legado para exibir boleto/Pix
- a resolucao de pagamento exibivel foi centralizada em `src/lib/financeiro/cobranca/resolverPagamentoExibivel.ts`, retornando:
  - `tipo_exibicao`
  - `invoice_id`
  - `neofin_charge_id`
  - `link_pagamento`
  - `linha_digitavel`
  - `codigo_barras`
  - `pix_copia_cola`
  - `qr_code_url`
  - `status_sincronizado`
  - `origem_dos_dados`
- a regra de `invoice_valida` foi endurecida para nao considerar somente um identificador textual legado como invoice aproveitavel
- o detalhe da cobranca financeira passou a exibir invoice resolvida, origem dos dados e dados remotos/local/legado sem confundir a cobranca canonica com o legado
- o fluxo de fechamento automatico mensal foi canonicamente concentrado em `processarFechamentoAutomaticoMensal.ts`
- o fluxo automatico, a rota legada de fechamento automatico e os fluxos manuais de fechar/gerar cobranca agora convergem para `processarCobrancaCanonicaFatura.ts`
- foi criada rota administrativa para reprocessamento/manual seguro:
  - `/api/financeiro/credito-conexao/fechamento-mensal/processar`
- a validacao em base real confirmou:
  - `33` contas ALUNO avaliadas no dry-run
  - `31` contas com acao elegivel
  - `0` erros no dry-run auditado
  - `0` origens com duplicidade de cobranca canonica nao cancelada no recorte validado

## Pendencias
- homologacao visual autenticada da tela de fatura da conta interna e do detalhe da cobranca financeira
- amarrar o servico de fechamento mensal a um gatilho operacional explicito de bootstrap/cron; nesta etapa foi criado o servico canonico e a rota administrativa, mas nao foi adicionado disparo oculto na UI
- backfill historico dos casos antigos em que `credito_conexao_faturas.cobranca_id` ainda aponta para cobranca-item ou `neofin_invoice_id` permanece nulo
- enriquecer os casos em que a NeoFin nao devolve linha digitavel/barcode/Pix, para confirmar em homologacao quais campos o provider realmente disponibiliza por billing
- seguir com saneamento do backlog global de lint fora do escopo deste modulo

## Bloqueios
- `npm run lint` continua falhando por erros preexistentes em outras areas do repositorio
- captura automatica de prints reais segue bloqueada por autenticacao local nas rotas privadas
- nao existe hoje um scheduler/boot executor explicito versionado chamando o fechamento mensal; a logica ficou pronta, mas a orquestracao operacional ainda depende de definicao do ambiente

## Versao do sistema
Sistema Conexao Danca - Conta Interna do Aluno / Fatura / NeoFin
Versao logica: v1.7 fechamento mensal canonico e tela operacional da fatura concluidos

## Proximas acoes
1. homologar em sessao autenticada a nova tela da fatura da conta interna com casos recentes de boleto e segunda via
2. homologar o detalhe da cobranca financeira para cobrancas `FATURA_CREDITO_CONEXAO` com invoice remota resolvida
3. conectar `src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts` a um gatilho operacional explicito de bootstrap ou agenda
4. executar backfill dos historicos com `neofin_invoice_id` ausente e referencias legadas antigas
5. monitorar em producao as novas faturas para confirmar preenchimento de link, linha digitavel e Pix quando a NeoFin retornar esses campos
