## Modulo atual
Dashboard Financeiro - Conta Interna Aluno e resultado por centro de custo

## SQL concluido
- auditoria operacional do bloco `Resultado por centro de custo` sem criar migration nova
- `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`: mantida como base da view operacional do dashboard mensal da Conta Interna Aluno
- `supabase/migrations/20251210_credito_conexao.sql`: confirmados `credito_conexao_lancamentos`, `credito_conexao_faturas` e `credito_conexao_fatura_lancamentos` como trilha de heranca de centro para receitas da Conta Interna Aluno
- `supabase/migrations/20251218_governanca_boletos_neofin.sql`: mantida a governanca de cobranca NeoFin via `cobrancas` e `recebimentos`
- `supabase/sql/diagnosticos/20260319_auditoria_centro_custo_dashboard.sql`: criado diagnostico para comparar recebimentos/pagamentos confirmados vs `movimento_financeiro` e rastrear perdas de centro em cobrancas, faturas e lancamentos
- nenhuma migration nova foi criada neste ciclo

## APIs concluidas
- `src/app/api/financeiro/dashboard/mensal/route.ts`
- `src/app/api/financeiro/dashboard-inteligente/centros-custo/route.ts`
- `src/lib/financeiro/dashboardMensalContaInterna.ts`
- `src/lib/financeiro/dashboardCentroCusto.ts`
- `src/lib/financeiro/dashboardInteligente.ts`
- `src/lib/financeiro/centrosCusto.ts`
- `src/lib/financeiro/processarClassificacaoFinanceira.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/page.tsx`
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

## Pendencias
- validacao visual autenticada com prints reais do dashboard, do modal mensal exportavel e do detalhe por centro de custo
- eventual enriquecimento futuro da composicao mensal com centro de custo nominal quando a trilha estiver disponivel em toda a cadeia operacional
- revisao futura dos recebimentos ainda sem centro resolvido apontados pelo diagnostico para eliminar sobras fora do bloco principal

## Bloqueios
- `npm run lint` continua falhando no repositorio por erros preexistentes fora do escopo deste modulo
- captura local de prints depende de sessao autenticada; sem login valido a rota privada redireciona para `/login`

## Versao do sistema
Sistema Conexao Danca - Dashboard Financeiro
Versao logica: v1.5 etapa do dashboard financeiro concluida para deploy

## Proximas acoes
1. validar em ambiente autenticado os centros `Escola Conexao Danca`, `Ballet Cafe`, `AJ Dance Store` e `Intermediacao Financeira` com dados reais da janela atual
2. gerar os prints finais do bloco corrigido, dos modais com `Exportar Excel`, do resize/maximizacao e do arquivo `.xlsx` aberto
3. monitorar o comportamento da etapa em producao apos o deploy e recolher feedback operacional
4. reduzir o estoque de recebimentos sem centro resolvido apontados pela query diagnostica
5. atacar a fila de erros globais de lint para recuperar validacao completa do repositorio
