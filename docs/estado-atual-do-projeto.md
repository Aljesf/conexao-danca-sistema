## Modulo atual
Dashboard Financeiro - Conta Interna Aluno, centro de custo e revisao da integracao Neofin x Cartao Conexao

## SQL concluido
- auditoria operacional do bloco `Resultado por centro de custo` sem criar migration nova
- `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`: mantida como base da view operacional do dashboard mensal da Conta Interna Aluno
- `supabase/migrations/20251210_credito_conexao.sql`: confirmados `credito_conexao_lancamentos`, `credito_conexao_faturas` e `credito_conexao_fatura_lancamentos` como trilha de heranca de centro para receitas da Conta Interna Aluno
- `supabase/migrations/20251218_governanca_boletos_neofin.sql`: mantida a governanca de cobranca NeoFin via `cobrancas` e `recebimentos`
- `supabase/sql/diagnosticos/20260319_auditoria_centro_custo_dashboard.sql`: criado diagnostico para comparar recebimentos/pagamentos confirmados vs `movimento_financeiro` e rastrear perdas de centro em cobrancas, faturas e lancamentos
- `supabase/sql/diagnosticos/20260319_diagnostico_neofin_cartao_conexao.sql`: criado diagnostico para distinguir cobranca canonica da fatura, cobranca-item, ausencia de `neofin_invoice_id`, referencias textuais da Neofin e possiveis duplicidades externas por competencia
- nenhuma migration nova foi criada neste ciclo

## APIs concluidas
- `src/app/api/financeiro/dashboard/mensal/route.ts`
- `src/app/api/financeiro/dashboard-inteligente/centros-custo/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- `src/app/api/credito-conexao/faturas/[id]/route.ts`
- `src/app/api/governanca/cobrancas/[id]/sincronizar-neofin/route.ts`
- `src/app/api/integracoes/neofin/cobrancas/gerar-boleto/route.ts`
- `src/app/api/integracoes/neofin/cobrancas/sync-boleto/route.ts`
- `src/lib/financeiro/dashboardMensalContaInterna.ts`
- `src/lib/financeiro/dashboardCentroCusto.ts`
- `src/lib/financeiro/dashboardInteligente.ts`
- `src/lib/financeiro/centrosCusto.ts`
- `src/lib/financeiro/processarClassificacaoFinanceira.ts`
- `src/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura.ts`
- `src/lib/credito-conexao/processarCobrancaCanonicaFatura.ts`
- `src/lib/financeiro/cobranca/providers/neofinProvider.ts`
- `src/lib/neofinClient.ts`
- `src/lib/neofinBilling.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/page.tsx`
- `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalSection.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalDetalheModal.tsx`
- `src/components/financeiro/dashboard/FinanceiroCentroCustoDetalheModal.tsx`
- `src/components/financeiro/dashboard/FinanceiroDashboardModalShell.tsx`
- `src/lib/export/xlsx.ts`
- `src/shadcn/ui.tsx`

## O que foi consolidado neste ciclo
- drill-down completo dos cards do topo e das competencias recentes, com modais auditaveis por composicao
- exclusao de cancelados, expurgados e equivalentes inativos da composicao principal do dashboard
- competencias futuras agora aparecem com base em lancamentos ativos ja gerados pela matricula/cartao conexao
- a leitura rapida do mes foi reposicionada para faixa horizontal, sem consumir a lateral da tabela principal
- cards de saude imediata foram adicionados para NeoFin confirmado, baixa interna, hoje e ultimos 7 dias
- a regra de recebimento NeoFin e baixa interna foi auditada e consolidada com classificacao operacional central
- a regra do bloco `Resultado por centro de custo` deixou de depender apenas de `movimento_financeiro` para receitas
- receitas agora usam recebimentos efetivamente confirmados no periodo, com heranca de centro por esta ordem:
  - `recebimentos.centro_custo_id`
  - `cobrancas.centro_custo_id`
  - `credito_conexao_lancamentos.centro_custo_id` vinculados a cobranca
  - `credito_conexao_fatura_lancamentos` + `credito_conexao_lancamentos` para cobrancas de fatura
  - fallback operacional por origem quando a trilha de centro existe apenas na geracao da carteira
- despesas agora usam pagamentos efetivamente confirmados em `contas_pagar_pagamentos`, com fallback para `contas_pagar.centro_custo_id`
- `movimento_financeiro` continua como complemento:
  - receitas standalone entram quando nao representam recebimentos/rateios ja refletidos na carteira confirmada
  - despesas standalone entram quando nao representam pagamentos de `contas_pagar` ja confirmados
- o snapshot inteligente passou a consumir a nova apuracao de centro de custo, mantendo coerencia entre card e drill-down
- o dashboard ganhou drill-down por centro de custo com modal detalhado, filtros e exportacao em Excel
- os modais de composicao da saude mensal agora exportam arquivo `.xlsx` real, respeitando filtros ativos
- o botao `Exportar Excel` foi padronizado no header superior direito dos modais do dashboard financeiro, reutilizando a mesma acao e os mesmos filtros do conteudo exibido
- os modais do dashboard financeiro agora abrem maiores, permitem resize manual e contam com acao de maximizar/restaurar para leitura de tabelas largas
- o helper `src/lib/export/xlsx.ts` foi criado para padronizar titulo, contexto, resumo e colunas exportadas
- os arquivos Excel do dashboard financeiro agora saem prontos para conferencia operacional, com moeda numerica formatada, datas legiveis, cabecalho superior organizado, autofilter, painel congelado e nome de arquivo padronizado
- o mapeamento de centros em `processarClassificacaoFinanceira.ts` foi corrigido para os codigos reais `ESCOLA`, `CAFE`, `LOJA` e `FIN`, evitando classificacoes novas com alias quebrado
- a integracao Neofin x Cartao Conexao foi revisada para usar a cobranca canonica da fatura como fonte unica de boleto/Pix
- o fluxo manual e o fluxo automatico de fechamento passaram a compartilhar `processarCobrancaCanonicaFatura.ts`, evitando divergencia entre geracao antecipada e fechamento normal
- o provider NeoFin do Cartao Conexao passou a enviar `billingType: "boleto"` explicitamente, em vez de depender do fallback `generic`
- a leitura de retorno da Neofin foi centralizada em `src/lib/neofinBilling.ts`, com extracao unica de `billing_url`, linha digitavel, codigo de barras, QR Pix, Pix copia e cola, tipo e status remoto
- `src/lib/neofinClient.ts` deixou de assumir que o `integration_identifier` textual e o ID real da cobranca e passou a resolver o billing numerico de forma segura, sem cair no primeiro item de uma listagem generica
- a pagina de detalhe da fatura do Cartao Conexao passou a priorizar a cobranca canonica e a invoice da fatura, mesmo quando o legado ainda aponta `credito_conexao_faturas.cobranca_id` para uma cobranca-item
- a UI de detalhe da fatura passou a exibir segunda via sem recriar cobranca e bloquear a acao manual quando ja existe invoice valida

## Pendencias
- validacao visual autenticada com prints reais do dashboard, do modal mensal exportavel e do detalhe por centro de custo
- eventual enriquecimento futuro da composicao mensal com centro de custo nominal quando a trilha estiver disponivel em toda a cadeia operacional
- revisao futura dos recebimentos ainda sem centro resolvido apontados pelo diagnostico para eliminar sobras fora do bloco principal
- backfill operacional dos casos historicos em que `credito_conexao_faturas.cobranca_id` ainda aponta para cobranca-item ou `neofin_invoice_id` ficou nulo mesmo com invoice remota existente
- validacao autenticada com casos recentes do Cartao Conexao para confirmar na UI o fim do texto `Outros bancos` quando a cobranca canonica da fatura ja possui boleto/Pix valido

## Bloqueios
- `npm run lint` continua falhando no repositorio por erros preexistentes fora do escopo deste modulo
- captura local de prints depende de sessao autenticada; sem login valido a rota privada redireciona para `/login`

## Versao do sistema
Sistema Conexao Danca - Dashboard Financeiro e integracao Neofin
Versao logica: v1.6 revisao canonica Neofin x Cartao Conexao concluida

## Proximas acoes
1. validar em ambiente autenticado os centros `Escola Conexao Danca`, `Ballet Cafe`, `AJ Dance Store` e `Intermediacao Financeira` com dados reais da janela atual
2. gerar os prints finais do bloco corrigido, dos modais com `Exportar Excel`, do resize/maximizacao e do arquivo `.xlsx` aberto
3. validar em ambiente autenticado faturas recentes do Cartao Conexao para confirmar reaproveitamento de invoice e exibir Boleto/Pix a partir da cobranca canonica
4. executar saneamento orientado pelo diagnostico para corrigir historicos com `neofin_invoice_id` ausente e vinculos antigos de cobranca-item
5. monitorar o comportamento da etapa em producao apos o deploy e recolher feedback operacional
6. reduzir o estoque de recebimentos sem centro resolvido apontados pela query diagnostica
7. atacar a fila de erros globais de lint para recuperar validacao completa do repositorio
