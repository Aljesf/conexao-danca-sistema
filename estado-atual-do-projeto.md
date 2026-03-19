# Modulo atual

Financeiro - contas a receber com origem canonica resiliente, centro de custo separado entre agrupador e lancamento, perdas por cancelamento detalhadas e trilha auditavel para ajuste manual de vencimento e cancelamento logico de cobrancas.

## SQL concluido

- criado o diagnostico `supabase/sql/diagnosticos/20260318_diagnostico_centro_custo_real.sql`
- criado o diagnostico `supabase/sql/diagnosticos/20260318_diagnostico_cobrancas_renegociacao_cancelamento.sql`
- o diagnostico de cobrancas cobre:
  - cobrancas vencidas em aberto
  - cobrancas em aberto ligadas a matricula cancelada
  - cobrancas liquidadas que nao podem ser alteradas/canceladas
  - cobrancas canceladas que ainda aparecam na view financeira
  - caso especifico da cobranca `#287`
- criada a migration `supabase/migrations/20260318_reforco_cancelamento_real.sql`
- criada a migration `supabase/migrations/20260318_cobrancas_ajuste_vencimento_cancelamento.sql`
- a migration nova adiciona em `public.cobrancas`:
  - `vencimento_original`
  - `vencimento_ajustado_em`
  - `vencimento_ajustado_por`
  - `vencimento_ajuste_motivo`
  - `cancelada_por`
  - `cancelamento_motivo`
  - `cancelamento_tipo`
- a compatibilidade legada foi preservada:
  - `cancelada_em` continua sendo reutilizada
  - `cancelada_motivo` continua preservada
  - `cancelada_por_user_id` continua preservada
- criada a tabela `public.cobrancas_historico_eventos`
- indices criados em:
  - `cobrancas_historico_eventos.cobranca_id`
  - `cobrancas_historico_eventos.tipo_evento`
  - `cobrancas_historico_eventos.created_at desc`
- a migration estrutural foi aplicada no banco local usado pela aplicacao
- a aplicacao no banco foi feita diretamente via SQL, sem `supabase db push`, porque a pasta de migrations do projeto ainda possui colisoes antigas de prefixo `20260318`
- schema confirmado apos a aplicacao:
  - colunas novas de ajuste/cancelamento presentes em `public.cobrancas`
  - `public.cobrancas_historico_eventos` existente
- nenhum backfill destrutivo de cobrancas foi executado nesta rodada

## APIs concluidas

- `src/lib/financeiro/contas-receber-auditoria.ts` passou a propagar para listas e detalhe:
  - `vencimentoOriginal`
  - `vencimentoAjustadoEm`
  - `vencimentoAjustadoPor`
  - `vencimentoAjusteMotivo`
  - `canceladaEm`
  - `canceladaPor`
  - `cancelamentoMotivo`
  - `cancelamentoTipo`
  - `matriculaStatus`
  - `matriculaCancelamentoTipo`
- a leitura segue compativel com banco legado:
  - se os campos novos nao existirem, a camada cai para fallback seguro
  - `cancelada_por_user_id` e `cancelada_motivo` continuam sendo aceitos como fonte de verdade
- criada a rota `GET /api/financeiro/cobrancas/[id]`
- criada a rota `POST /api/financeiro/cobrancas/[id]/alterar-vencimento`
- criada a rota `POST /api/financeiro/cobrancas/[id]/cancelar`
- as rotas novas usam transacao via `pg` e inserem eventos em `public.cobrancas_historico_eventos`
- regra implementada para alteracao de vencimento:
  - bloqueia cobranca liquidada
  - bloqueia cobranca cancelada
  - preenche `vencimento_original` apenas na primeira alteracao
  - grava `ALTERACAO_VENCIMENTO` no historico
- regra implementada para cancelamento:
  - bloqueia cobranca liquidada
  - bloqueia cobranca ja cancelada
  - bloqueia cobranca com `neofin_charge_id`
  - marca status `CANCELADA` sem excluir registro
  - preenche colunas novas e legadas de cancelamento
  - grava `CANCELAMENTO_COBRANCA` no historico
- mantida a exclusao logica das listas ativas:
  - cobrancas canceladas deixam de aparecer em contas a receber e titulos vencidos
  - continuam acessiveis no detalhe da cobranca e no historico
- `src/app/api/financeiro/contas-a-receber/vencidas/por-pessoa/route.ts` e `src/app/api/pessoas/[id]/resumo-financeiro/route.ts` passaram a devolver os campos auditaveis novos
- a regra da tela `GET /api/financeiro/perdas-cancelamento` foi ampliada:
  - continua aceitando desistencia real explicita na matricula
  - aceita fallback por motivo legado compativel com evasao real
  - passa a aceitar cobranca cancelada manualmente no financeiro quando vinculada a matricula cancelada sem semantica tecnica de exclusao
  - continua excluindo ajuste de sistema, duplicidade, transferencia e troca de turma
- o payload de perdas agora devolve explicabilidade por item:
  - `motivoEntradaPerda`
  - `origemSemanticaPerda`
  - `cancelamentoReconhecidoPor`
  - `possuiCobrancaCancelada`
  - `possuiSaldoAberto`
  - `possuiValorPotencial`

## Paginas/componentes concluidos

- criado `src/components/financeiro/cobrancas/CobrancaOperacionalActions.tsx`
- o componente novo oferece:
  - botao `Alterar vencimento`
  - botao `Cancelar titulo`
  - modal de nova data e motivo obrigatorio
  - modal de tipo de cancelamento e motivo obrigatorio
  - feedback visual de sucesso/erro
  - `router.refresh()` e callback de recarga para listas cliente
- `src/components/financeiro/contas-receber/CobrancasTable.tsx` passou a expor as duas acoes na fila principal
- `src/components/financeiro/contas-receber/ContasReceberFilters.tsx` foi enxugado visualmente:
  - busca ganhou prioridade visual e largura dominante
  - visao e ordenacao ficaram no bloco principal
  - filtros secundarios ficaram compactos em uma segunda linha
  - o card explicativo lateral foi removido
  - a area passou a mostrar um resumo discreto do recorte ativo
- `src/app/(private)/admin/financeiro/contas-receber/page.tsx` passou a expor as acoes:
  - no modal `Titulos vencidos`
  - no detalhe da cobranca dentro do dialog de auditoria
- `src/components/pessoas/PessoaResumoFinanceiro.tsx` passou a expor as acoes na lista `Titulos em aberto`
- `src/app/(private)/financeiro/cobrancas/[id]/page.tsx` agora mostra:
  - vencimento original
  - ultimo ajuste de vencimento
  - cancelamento, se houver
  - bloco de acoes operacionais
  - historico de eventos da cobranca
- `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx` passou a exibir:
  - vencimento original
  - ultimo ajuste
  - cancelamento
  - status da matricula relacionada
- a UI continua sem esconder cobrancas ambiguas por ausencia de conta interna
- quando a cobranca estiver ligada a matricula cancelada, a UI agora sinaliza o contexto para decisao manual
- `src/components/financeiro/PerdasCancelamentoTable.tsx` passou a mostrar:
  - origem semantica da perda
  - motivo de entrada em perdas
  - reconhecimento por matricula, motivo legado ou cobranca cancelada manualmente
  - valor aberto associado separado de valor potencial perdido
  - causa da exclusao anterior quando o caso entrou apenas apos a ampliacao da regra

## Pendencias

- gerar evidencias visuais autenticadas da fila de cobranca, do modal `Titulos vencidos`, do resumo financeiro da pessoa e do detalhe da cobranca
- decidir se a rota antiga de governanca de cancelamento simples sera descontinuada ou passara a delegar para a rota financeira com historico
- avaliar saneamento semantico fino dos casos `AMBIGUO` da origem canonica antes da campanha de renegociacao
- avaliar se a futura renegociacao criara novo tipo de evento no historico de cobrancas ou se reutilizara a mesma trilha
- revisar se deve existir exibicao historica agregada de cobrancas canceladas dentro da tela principal de contas a receber

## Bloqueios

- nao ha harness autenticado pronto para capturar prints reais das telas privadas nesta etapa
- o `next build` deste repositorio continua configurado para pular validacao de tipos e lint
- o `npm run lint` global continua falhando por passivo antigo fora do escopo desta frente, especialmente em modulos de loja, usuarios e formularios

## Versao do sistema

Conectarte v0.9 - contas a receber com origem canonica, centro de custo separado, perdas por cancelamento detalhadas e cobrancas com ajuste manual de vencimento / cancelamento auditavel.

## Proximas acoes

- validar visualmente as telas privadas com sessao autenticada e gerar os prints operacionais
- decidir o fluxo exato da futura renegociacao em cima de `cobrancas_historico_eventos`
- padronizar a trilha de cancelamento entre governanca financeira e financeiro operacional
- voltar ao saneamento manual dos casos de origem `AMBIGUO`
- corrigir a padronizacao historica dos nomes de migrations para reduzir risco em futuras aplicacoes por lote

## Validacao

- `npx next lint --file ...` nos arquivos alterados nesta tarefa: ok
- `npm run build`: ok
- `npm run lint`: falha por passivo antigo fora do escopo desta tarefa
- migration `20260318_cobrancas_ajuste_vencimento_cancelamento.sql` aplicada no banco local: ok
- schema confirmado no banco local:
  - `cancelada_por`: ok
  - `cancelamento_motivo`: ok
  - `cancelamento_tipo`: ok
  - `vencimento_original`: ok
  - `vencimento_ajustado_em`: ok
  - `vencimento_ajustado_por`: ok
  - `vencimento_ajuste_motivo`: ok
  - `public.cobrancas_historico_eventos`: ok
- validacao funcional segura da cobranca `#287` executada em transacoes com `ROLLBACK`:
  - alteracao de vencimento simulada para `2026-03-25`: ok
  - `vencimento_original` preservado como `2026-02-12`: ok
  - evento `ALTERACAO_VENCIMENTO` gerado no historico da transacao: ok
  - cancelamento manual com tipo `CANCELAMENTO_POR_MATRICULA_CANCELADA`: ok
  - evento `CANCELAMENTO_COBRANCA` gerado no historico da transacao: ok
  - nenhum dado final foi persistido nessa validacao porque a transacao foi revertida
- diagnostico real da cobranca `#287` no ambiente local:
  - status atual: `PENDENTE`
  - matricula relacionada: `#7`
  - status da matricula: `CANCELADA`
  - conta interna relacionada: `#23`
  - sem recebimentos associados no momento da validacao
  - elegivel para cancelamento manual por matricula cancelada
  - elegivel para alteracao de vencimento
