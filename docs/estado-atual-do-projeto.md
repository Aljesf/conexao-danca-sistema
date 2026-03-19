## Modulo atual
Dashboard Financeiro - Conta Interna Aluno

## SQL concluido
- validacao da semantica real de status e cancelamento nas tabelas operacionais ja existentes
- `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`: view `public.vw_financeiro_cobrancas_operacionais` segue como base principal do dashboard
- `supabase/migrations/add_expurgo_cobrancas.sql`: confirmados os campos de expurgo logico em `cobrancas` (`expurgada`, `expurgada_em`, `expurgada_por`, `expurgo_motivo`)
- `supabase/migrations/20260113_180101_financeiro_cobrancas_avulsas.sql`: confirmados os status canonicos de `financeiro_cobrancas_avulsas` (`PENDENTE`, `PAGO`, `CANCELADO`, `VENCIDO`)
- `supabase/migrations/20251210_credito_conexao.sql`: confirmados os status de `credito_conexao_lancamentos` (`PENDENTE_FATURA`, `FATURADO`, `CANCELADO`)
- `supabase/migrations/20260216190000_financeiro_config_fechamento_faturas.sql`: confirmados os status de `credito_conexao_faturas` (`ABERTA`, `FECHADA`, `PAGA`, `EM_ATRASO`, `CANCELADA`)
- nenhuma migration nova foi criada neste ciclo; a correcao ficou concentrada na API e na normalizacao do payload

## APIs concluidas
- `src/app/api/financeiro/dashboard/mensal/route.ts`
- `src/lib/financeiro/dashboardMensalContaInterna.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/page.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalSection.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalDetalheModal.tsx`

## O que foi consolidado neste chat
- normalizacao central de carteira com `status_original`, `status_normalizado`, flags de elegibilidade e motivo de exclusao por item
- exclusao de itens `cancelado`, `cancelada`, `expurgado` e equivalentes inativos dos totais principais de previsto, pendente, vencido, NeoFin e inadimplencia
- preservacao de auditoria no payload detalhado com `excluido_do_total` e `motivo_exclusao`
- recebido principal limitado a recebimentos financeiros confirmados e elegiveis; combinacoes textuais ambiguas deixaram de contaminar o agregado
- previsao anual baseada tambem em `credito_conexao_lancamentos` ativos ja gerados pela matricula/cartao conexao, mesmo sem fatura fechada
- separacao semantica entre lancamento financeiro gerado, fatura, carteira NeoFin e pagamento confirmado
- serie de competencias mantida continua ate dezembro do ano visualizado, com meses futuros e meses zerados preservados no payload
- cards e modais alinhados com a mesma regra de apuracao, sem reintroduzir cancelados na composicao principal
- textos operacionais discretos na UI explicando uso de lancamentos ativos futuros e exclusao de cancelados/expurgados

## Pendencias
- validacao visual autenticada com prints reais do dashboard e dos modais em ambiente com sessao valida
- conferencia final com massa real de dados para medir impacto de desempenho do detalhamento enriquecido
- avaliacao futura de uma secao opcional de auditoria para exibir itens excluidos fora da soma principal

## Bloqueios
- `npm run lint` continua falhando no repositorio por erros preexistentes fora do escopo deste modulo
- captura local de prints depende de sessao autenticada; sem login valido a rota privada redireciona para `/login`

## Versao do sistema
Sistema Conexao Danca - Dashboard Financeiro
Versao logica: v1.2 dashboard mensal auditavel com exclusao canonica de cancelados e previsao por lancamentos gerados

## Proximas acoes
1. validar em ambiente autenticado os casos reais de cancelado fora do total e de lancamento futuro aparecendo ate dezembro
2. gerar os prints finais do dashboard, do modal de previsto e de uma competencia futura com composicao rastreavel
3. considerar uma visao secundaria de itens excluidos para auditoria historica sem contaminar os cards principais
4. atacar a fila de erros globais de lint para recuperar validacao completa do repositorio
