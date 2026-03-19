## Modulo atual
Dashboard Financeiro - Conta Interna Aluno

## SQL concluido
- validacao da base existente em `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`
- confirmacao de uso da view `public.vw_financeiro_cobrancas_operacionais` como base canonica do dashboard mensal
- confirmacao de competencia canonica em `YYYY-MM`
- confirmacao das origens de previsto, recebido, pendente, vencido e NeoFin na view operacional
- confirmacao de vinculo com pessoa, conta interna (`conta_conexao_id`) e fatura/NeoFin
- nenhuma migration nova foi criada neste ciclo

## APIs concluidas
- `src/app/api/financeiro/dashboard/mensal/route.ts`
- `src/lib/financeiro/dashboardMensalContaInterna.ts`

## Paginas / componentes concluidos
- `src/app/(private)/admin/financeiro/page.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalSection.tsx`
- `src/components/financeiro/dashboard/FinanceiroMensalDetalheModal.tsx`

## O que foi consolidado neste chat
- serie canonica mensal no backend para impedir sumico de competencias intermediarias
- meses ausentes mantidos no payload com zero e observacao de ausencia
- cards do topo com drill-down auditavel no mesmo endpoint
- detalhamento por competencia com composicoes separadas para previsto, pago, pendente, vencido e NeoFin
- composicao operacional por item com cobranca, pessoa, conta interna, origem, status, valores e datas
- modal auditavel com subtotal, quantidade, filtros por competencia/status/origem/NeoFin/pessoa e tabela detalhada
- cards KPI clicaveis
- celulas monetarias da tabela clicaveis
- CTA discreto na leitura rapida do mes para abrir composicoes
- reaproveitamento da rota atual do dashboard mensal sem endpoint adicional

## Pendencias
- validacao visual autenticada com prints reais do dashboard e dos modais em ambiente com sessao valida
- avaliacao de performance com massa real maior para decidir se algum detalhamento deve migrar para endpoint complementar
- eventual seletor explicito de intervalo/competencia na UI, caso o produto queira navegar outros recortes sem depender do mes atual

## Bloqueios
- `npm run lint` nao passa no repositorio por erros preexistentes fora do escopo deste modulo
- tentativa de captura de prints locais bloqueada por autenticacao da area privada; acesso a `http://127.0.0.1:3001/admin/financeiro` redirecionou com `307` para `/login`

## Versao do sistema
Sistema Conexao Danca - Dashboard Financeiro
Versao logica: v1.1 dashboard mensal auditavel da Conta Interna Aluno

## Proximas acoes
1. validar os modais com sessao autenticada e gerar os prints finais do fluxo
2. revisar o comportamento com dados reais de meses zerados e competencias futuras
3. decidir se o dashboard deve ganhar seletor de faixa mensal no proprio bloco
4. atacar a fila de erros globais de lint para voltar a ter validacao completa do repositorio
