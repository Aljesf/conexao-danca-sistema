## Modulo atual
Conta interna do aluno - carteira operacional por competencia alinhada a contas a receber, com fatura, cobranca vinculada e leitura NeoFin consistente

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
  - `supabase/sql/diagnosticos/20260319_diagnostico_competencia_ativa_vs_contas_receber.sql`

## APIs concluidas
- `src/lib/credito-conexao/processarFechamentoAutomaticoMensal.ts`
- `src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/fechamento-automatico/route.ts`
- `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`
- `src/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura.ts`
- `src/lib/financeiro/cobranca/resolverPagamentoExibivel.ts`
- `src/lib/neofinBilling.ts`
- `src/lib/neofinClient.ts`
- `src/lib/neofinResolverLinkPublico.ts`
- `src/lib/financeiro/cobranca/providers/neofinProvider.ts`
- `src/app/api/credito-conexao/faturas/[id]/route.ts`
- `src/app/api/governanca/cobrancas/[id]/route.ts`
- `src/app/api/governanca/cobrancas/[id]/sincronizar-neofin/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- `src/lib/financeiro/competenciaAtiva/resolverCarteiraOperacionalPorCompetencia.ts`
- `src/app/api/financeiro/credito-conexao/cobrancas/route.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- `src/app/(private)/admin/governanca/cobrancas/[id]/page.tsx`
- `src/app/(private)/admin/financeiro/credito-conexao/cobrancas/page.tsx`
- `src/components/financeiro/credito-conexao/CobrancasMensaisResumo.tsx`
- `src/components/financeiro/credito-conexao/CobrancasCompetenciaCard.tsx`
- `src/components/financeiro/credito-conexao/CobrancaStatusSection.tsx`
- `src/components/financeiro/credito-conexao/CobrancaRow.tsx`
- `src/components/financeiro/credito-conexao/CompetenciaTabs.tsx`
- `src/components/financeiro/credito-conexao/VincularCobrancaFaturaDialog.tsx`
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
- a tela de competencia ativa passou a usar a mesma carteira real de contas a receber como criterio canonico de elegibilidade
- a selecao operacional da competencia ativa agora nasce de `vw_financeiro_contas_receber_flat` + `cobrancas`, e usa `vw_financeiro_cobrancas_operacionais` apenas para enriquecer as cobrancas oficiais ainda elegiveis
- a comparacao real em base local mostrou que a leitura antiga trazia `422` itens e a nova passou para `315`, removendo `107` itens indevidos:
  - `96` cancelados
  - `11` expurgados
- itens cancelados, expurgados ou substituidos por reprocessamento deixaram de aparecer como carteira operacional da competencia ativa
- a competencia ativa agora fala a mesma linguagem publica da carteira real:
  - conta interna do aluno
  - competencia
  - fatura vinculada
  - cobranca vinculada
- a semantica antiga de matricula deixou de ser o eixo principal da tela; quando existir, aparece apenas como origem do lancamento/cobranca
- a fatura da conta interna virou tela operacional final, com hierarquia visual clara, cabecalho util, card de pagamento, card da cobranca oficial da fatura, lancamentos legiveis e auditoria tecnica recolhivel
- a leitura de pagamento da fatura passou a priorizar a cobranca canonica e os dados remotos da NeoFin, sem depender do `charge_id` textual legado para exibir boleto/Pix
- a abertura publica do NeoFin foi endurecida para usar apenas URL com correspondencia confirmada entre cobranca local e entidade remota
- o fallback perigoso que podia abrir `billing/{chargeId}` sem validacao foi removido da UI e da camada de resolucao
- a resolucao de pagamento exibivel foi centralizada em `src/lib/financeiro/cobranca/resolverPagamentoExibivel.ts`, retornando:
  - `tipo_exibicao`
  - `invoice_id`
  - `neofin_charge_id`
  - `link_pagamento`
  - `link_pagamento_validado`
  - `link_pagamento_origem`
  - `correspondencia_confirmada`
  - `tipo_correspondencia`
  - `payment_number`
  - `linha_digitavel`
  - `codigo_barras`
  - `pix_copia_cola`
  - `qr_code_url`
  - `status_sincronizado`
  - `origem_dos_dados`
- a busca por `integration_identifier` na NeoFin deixou de aceitar candidatos recentes sem identificador realmente presente no payload remoto
- a UI da fatura e da governanca financeira agora informa se o link e oficial da invoice, oficial da parcela, fallback validado ou indisponivel
- cobrancas pagas com URL confirmada passaram a ser mostradas como historico informativo, e nao mais como segunda via ativa
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
- homologacao visual autenticada da tela de competencia ativa da conta interna contra a tela de contas a receber
- homologacao visual autenticada da tela de fatura da conta interna e do detalhe da cobranca financeira
- amarrar o servico de fechamento mensal a um gatilho operacional explicito de bootstrap/cron; nesta etapa foi criado o servico canonico e a rota administrativa, mas nao foi adicionado disparo oculto na UI
- backfill historico dos casos antigos em que `credito_conexao_faturas.cobranca_id` ainda aponta para cobranca-item ou `neofin_invoice_id` permanece nulo
- normalizar historicos em que a cobranca local ainda esta pendente, mas o billing remoto ja consta como `paid`, para reduzir ruido operacional nas telas
- enriquecer os casos em que a NeoFin nao devolve linha digitavel/barcode/Pix, para confirmar em homologacao quais campos o provider realmente disponibiliza por billing
- seguir com saneamento do backlog global de lint fora do escopo deste modulo

## Bloqueios
- `npm run lint` continua falhando por erros preexistentes em outras areas do repositorio
- captura automatica de prints reais segue bloqueada por autenticacao local nas rotas privadas
- nao existe hoje um scheduler/boot executor explicito versionado chamando o fechamento mensal; a logica ficou pronta, mas a orquestracao operacional ainda depende de definicao do ambiente

## Versao do sistema
Sistema Conexao Danca - Conta interna do aluno / carteira operacional / fatura / NeoFin
Versao logica: v1.9 competencia ativa alinhada a contas a receber e sem cancelados na leitura operacional

## Proximas acoes
1. homologar em sessao autenticada a nova tela de competencia ativa contra a carteira oficial de contas a receber
1. homologar em sessao autenticada a nova tela da fatura da conta interna com casos recentes de boleto e segunda via
2. homologar o detalhe da cobranca financeira para cobrancas `FATURA_CREDITO_CONEXAO` com invoice remota resolvida
3. conectar `src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts` a um gatilho operacional explicito de bootstrap ou agenda
4. executar backfill dos historicos com `neofin_invoice_id` ausente e referencias legadas antigas
5. monitorar em producao as novas faturas para confirmar preenchimento de link, linha digitavel e Pix quando a NeoFin retornar esses campos
6. homologar visualmente os novos estados `oficial da invoice`, `oficial da parcela`, `historico informativo` e `indisponivel` na fatura e na governanca
