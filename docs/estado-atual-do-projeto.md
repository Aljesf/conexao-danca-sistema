# Estado Atual Do Projeto
**Projeto:** Sistema Conexao Danca  
**Data:** 2026-04-03  
**Branch:** `main`  
**Ciclo em foco:** reestruturacao do modulo financeiro

---

## 1. Modulo Atual Em Foco

O foco atual do projeto e o modulo financeiro unificado:
- Conta Interna (`credito_conexao`)
- fechamento mensal automatico
- integracao Neofim por webhook e polling
- FIN como camara de compensacao
- reprocessamento de taxas de atraso
- secretaria/caixa para recebimento presencial da Conta Interna

Arquivos centrais deste ciclo:
- [processarFechamentoAutomaticoMensal.ts](C:/Users/aliri/conexao-dados/src/lib/credito-conexao/processarFechamentoAutomaticoMensal.ts)
- [processarClassificacaoFinanceira.ts](C:/Users/aliri/conexao-dados/src/lib/financeiro/processarClassificacaoFinanceira.ts)
- [confirmarPagamentoCobranca.ts](C:/Users/aliri/conexao-dados/src/lib/financeiro/confirmarPagamentoCobranca.ts)
- [poll-neofin/route.ts](C:/Users/aliri/conexao-dados/src/app/api/governanca/cobrancas/poll-neofin/route.ts)
- [webhook/route.ts](C:/Users/aliri/conexao-dados/src/app/api/integracoes/neofim/webhook/route.ts)

---

## 2. SQL/Migrations Concluidos Neste Ciclo

Migrations adicionadas no repositorio e validadas no ciclo:
- [20260403_001_neofim_webhook_log.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_001_neofim_webhook_log.sql)
- [20260403_002_financeiro_config_prorata_e_exercicio.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_002_financeiro_config_prorata_e_exercicio.sql)
- [20260403_003_taxa_matricula.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_003_taxa_matricula.sql)
- [20260403_004_credito_conexao_limite_historico.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_004_credito_conexao_limite_historico.sql)
- [20260403_005_fin_conta_financeira.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_005_fin_conta_financeira.sql)
- [20260403_006_fn_reprocessar_taxas_faturas_atraso.sql](C:/Users/aliri/conexao-dados/supabase/migrations/20260403_006_fn_reprocessar_taxas_faturas_atraso.sql)

Ajustes de banco executados no ciclo:
- aplicacao da idempotencia de cobrancas de eventos
- conciliacao das cobrancas duplicadas residuais
- migracao de `dia_fechamento=0` para fechamento no ultimo dia do mes
- correcao de formas de pagamento do Cafe e da Escola
- limpeza de residuos financeiros e dados de teste

---

## 3. APIs Concluidas Neste Ciclo

Rotas adicionadas ou concluidas:
- [fechamento-mensal/processar/route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/fechamento-mensal/processar/route.ts)
- [cron-diario/route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/dashboard-inteligente/cron-diario/route.ts)
- [poll-neofin/route.ts](C:/Users/aliri/conexao-dados/src/app/api/governanca/cobrancas/poll-neofin/route.ts)
- [webhook/route.ts](C:/Users/aliri/conexao-dados/src/app/api/integracoes/neofim/webhook/route.ts)
- [reprocessar-taxas/route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/reprocessar-taxas/route.ts)
- [limite/route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/contas/[id]/limite/route.ts)
- [gerar-lancamentos-mensais/route.ts](C:/Users/aliri/conexao-dados/src/app/api/credito-conexao/gerar-lancamentos-mensais/route.ts)
- [novo/route.ts](C:/Users/aliri/conexao-dados/src/app/api/matriculas/novo/route.ts)
- [cancelar/route.ts](C:/Users/aliri/conexao-dados/src/app/api/matriculas/[id]/cancelar/route.ts)
- [liquidacao/route.ts](C:/Users/aliri/conexao-dados/src/app/api/financeiro/formas-pagamento/liquidacao/route.ts)

Servicos e helpers relevantes:
- [verifyCronSecret.ts](C:/Users/aliri/conexao-dados/src/lib/auth/verifyCronSecret.ts)
- [calcularTaxasFatura.ts](C:/Users/aliri/conexao-dados/src/lib/credito-conexao/calcularTaxasFatura.ts)
- [verificarLimiteCreditoConexao.ts](C:/Users/aliri/conexao-dados/src/lib/credito-conexao/verificarLimiteCreditoConexao.ts)
- [recalcularTiersAposDesmatricula.ts](C:/Users/aliri/conexao-dados/src/lib/matriculas/recalcularTiersAposDesmatricula.ts)

---

## 4. Paginas/Componentes Concluidos

Paginas e componentes alterados no ciclo:
- [page.tsx](C:/Users/aliri/conexao-dados/src/app/(private)/secretaria/caixa/page.tsx)
- [ReceberContaInternaModal.tsx](C:/Users/aliri/conexao-dados/src/components/secretaria/caixa/ReceberContaInternaModal.tsx)
- [types.ts](C:/Users/aliri/conexao-dados/src/components/secretaria/caixa/types.ts)
- [ReciboModal.tsx](C:/Users/aliri/conexao-dados/src/components/documentos/ReciboModal.tsx)
- [DocumentoEmissaoResultado.tsx](C:/Users/aliri/conexao-dados/src/components/documentos/recibos/DocumentoEmissaoResultado.tsx)

Estado funcional consolidado:
- secretaria consegue operar recebimento presencial da Conta Interna
- regras de classificacao financeira estao centralizadas
- cobrancas Neofim agora contam com polling automatico previsto em cron

---

## 5. Pendencias

- `M10`: faturas com `neofin_invoice_id` ausente ainda exigem acompanhamento
- `B6`: Loja ainda nao identifica formalmente perfil do comprador
- `B4`: multi-tenancy financeiro ainda nao implementado
- fechamento manual da folha de `2026-03`
- eventual nova matricula para Aurora Cunha Silva, se necessario

---

## 6. Bloqueios

- a Neofim nao oferece webhook customizado confiavel para este cenario; a estrategia atual e polling
- a validacao manual de algumas rotas administrativas depende de sessao autenticada no navegador
- o reprocessamento via HTTP de algumas rotas protegidas depende de contexto autenticado, apesar de o nucleo de negocio estar funcional

---

## 7. Versao Do Sistema

Estado consolidado do ciclo:
- ciclo financeiro 2026-04-03 finalizado
- docs canonicos financeiros atualizados
- scheduler, FIN, polling, tiers, multas e limpeza de dados concluidos

Referencias canonicas:
- [financeiro-especificacao-oficial.md](C:/Users/aliri/conexao-dados/docs/financeiro-especificacao-oficial.md)
- [financeiro-plano-correcao.md](C:/Users/aliri/conexao-dados/docs/financeiro-plano-correcao.md)

---

## 8. Proximas Acoes

1. Reduzir o passivo de faturas sem `neofin_invoice_id`.
2. Implementar Loja com perfil do comprador e tabela de preco por perfil.
3. Preparar base para multi-tenancy com `organizacao_id`.
4. Homologar rotinas finais da Neofim em operacao real recorrente.

---

*Fim do documento - estado-atual-do-projeto.md*  
*Atualizado em: 2026-04-03*
