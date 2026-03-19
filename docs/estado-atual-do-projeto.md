## Modulo atual
Dashboard Financeiro - Conta Interna Aluno

## SQL concluido
- auditoria da semantica real de recebimento NeoFin e baixa interna sem criar migration nova
- `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`: a view `public.vw_financeiro_cobrancas_operacionais` segue como base principal do dashboard
- `supabase/migrations/20251218_governanca_boletos_neofin.sql`: confirmada a governanca NeoFin baseada em `cobrancas` e agregacao de `recebimentos`, sem confirmacao financeira isolada persistida em tabela separada
- `supabase/migrations/20251210_credito_conexao.sql`: confirmados os lancamentos futuros em `credito_conexao_lancamentos` como base da previsao mesmo sem fatura fechada
- `supabase/migrations/20260113_180101_financeiro_cobrancas_avulsas.sql`: confirmadas as baixas avulsas em `financeiro_cobrancas_avulsas` com `pago_em`, `forma_pagamento` e `status`
- nenhuma migration nova foi criada neste ciclo; os ajustes ficaram concentrados na API, na classificacao central e na UI

## APIs concluidas
- `src/app/api/financeiro/dashboard/mensal/route.ts`
- `src/lib/financeiro/dashboardMensalContaInterna.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/page.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalSection.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalDetalheModal.tsx`

## O que foi consolidado neste chat
- reordenacao cronologica crescente da tabela de competencias, do menor mes do recorte ate dezembro do ano visualizado
- remocao da coluna lateral da leitura rapida e reorganizacao do bloco em faixa horizontal responsiva, sem reduzir a largura util da tabela principal
- inclusao de novos cards auditaveis:
  - `Recebido via NeoFin`
  - `Recebido por baixa interna`
  - `Recebido hoje`
  - `Recebido ultimos 7 dias`
- criacao da classificacao central de canal de recebimento com:
  - `isNeoFinConfirmedReceipt`
  - `isInternalConfirmedReceipt`
  - `classifyReceiptChannel`
- regra conservadora de confirmacao NeoFin:
  - sincronizacao remota de status NeoFin, sozinha, nao transforma o titulo em recebido para o dashboard
  - o card NeoFin recebido so soma itens com confirmacao financeira local elegivel, lastreados por `recebimentos` ou baixa local equivalente
- segregacao entre recebimento NeoFin confirmado e baixa interna/manual por origem de sistema, forma de pagamento e metodo de pagamento
- manutencao da exclusao de cancelados, expurgados e itens inativos de todos os totais principais e dos modais
- detalhamento enriquecido dos recebimentos com canal, origem do recebimento, forma/metodo de pagamento e data efetiva de confirmacao
- preservacao da previsao futura com base em lancamentos ativos ja gerados pela matricula/cartao conexao, mesmo sem fatura fechada

## Pendencias
- validacao visual autenticada com prints reais do dashboard e dos modais em ambiente com sessao valida
- ampliacao futura da leitura de recebimentos recentes para cobrir carteiras fora do recorte operacional anual, se o produto quiser cards diarios/semanalmente globais
- eventual separacao visual opcional de itens excluidos para auditoria historica sem contaminar a soma principal

## Bloqueios
- `npm run lint` continua falhando no repositorio por erros preexistentes fora do escopo deste modulo
- captura local de prints depende de sessao autenticada; sem login valido a rota privada redireciona para `/login`

## Versao do sistema
Sistema Conexao Danca - Dashboard Financeiro
Versao logica: v1.3 saude imediata com classificacao de recebimentos NeoFin x baixa interna

## Proximas acoes
1. validar em ambiente autenticado os casos reais de `Recebido via NeoFin`, `Recebido hoje` e `Recebido ultimos 7 dias`
2. gerar os prints finais com cards novos, leitura rapida horizontal, tabela em ordem crescente e modais por canal de recebimento
3. revisar a reconciliacao operacional NeoFin para garantir que toda confirmacao remota relevante gere lastro financeiro local quando necessario
4. atacar a fila de erros globais de lint para recuperar validacao completa do repositorio
