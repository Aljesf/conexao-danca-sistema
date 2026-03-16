## Modulo atual
Evolucao operacional do Ballet Cafe e do painel do colaborador para suportar caixa com venda retroativa, baixa parcial, envio para conta interna por competencia e leitura gerencial pela folha.

## SQL concluido
- Migration `supabase/migrations/20260316_01_cafe_comandas_retroativas_e_painel_colaborador.sql` criada.
- Estrutura operacional reaproveitada em `public.cafe_vendas` e `public.cafe_venda_itens`, sem criar financeiro paralelo do cafe.
- `cafe_vendas` agora suporta `data_operacao`, `data_competencia`, `colaborador_pessoa_id`, `tipo_quitacao`, `valor_pago_centavos`, `valor_em_aberto_centavos` e `observacoes_internas`.
- Constraints e indices adicionados para tipo de quitacao, status de pagamento, competencia, colaborador, cobranca e consistencia dos valores.
- Itens do cafe passaram a registrar `descricao_snapshot`, `valor_unitario_centavos` e `valor_total_centavos`.
- Venda retroativa, conta interna do colaborador por competencia e vinculo com cobranca canonica ficaram documentados na propria migration.

## APIs concluidas
- `GET/POST /api/cafe/caixa` criado para listar e registrar comandas com filtros operacionais, pagamento imediato, parcial ou conta interna.
- `GET/PUT /api/cafe/caixa/[id]` criado para detalhar e ajustar data retroativa, observacoes e vinculo com colaborador antes do faturamento.
- `POST /api/cafe/caixa/[id]/baixas` criado para baixa parcial ou total com recebimento real e movimento financeiro.
- `POST /api/cafe/caixa/[id]/enviar-conta-interna` criado para converter saldo aberto em divida do colaborador por competencia.
- `GET /api/admin/colaboradores/[id]/financeiro-resumo` criado para consolidar conta interna, debitos, faturas, competencias e ultimos lancamentos.
- `GET /api/financeiro/folha/colaboradores/[id]/painel` criado para visao SaaS por competencia, fatura, cobranca e status de importacao para folha.
- Rotas legadas de `/api/cafe/vendas` e `/api/admin/colaboradores/[id]/resumo-financeiro` passaram a reaproveitar os novos handlers.
- A integracao financeira reutiliza `cobrancas`, `recebimentos`, `movimento_financeiro`, `credito_conexao_lancamentos`, `credito_conexao_faturas` e o helper canonico por `cobranca_id`.

## Paginas/componentes concluidos
- `src/app/(private)/cafe/caixa/page.tsx` criado como nova frente de caixa operacional do Ballet Cafe.
- O caixa do cafe agora suporta venda do dia, lancamento retroativo, colaborador opcional, observacoes internas, competencia e acoes de baixa ou envio para conta interna.
- A listagem operacional do caixa mostra comandas recentes com filtros por data, colaborador, status e competencia, alem de links para cobranca e fatura.
- `src/app/(private)/admin/config/colaboradores/[id]/page.tsx` passou a exibir painel financeiro do colaborador com conta interna, resumo financeiro, debitos por origem, competencias, faturas e ultimos lancamentos.
- `src/app/(private)/admin/financeiro/folha/colaboradores/page.tsx` ganhou indicadores gerenciais, filtros por competencia/status, atalho para perfil do colaborador e leitura dos debitos em aberto.
- A navegacao do modulo cafe foi ajustada para priorizar `/cafe/caixa`, mantendo compatibilidade com a rota legada `/cafe/vendas`.

## Pendencias
- Validar no banco a aplicacao da nova migration em ambiente com dados reais do cafe.
- Validar por print o fluxo completo do caixa do cafe: cadastro de comanda, baixa parcial e envio para conta interna.
- Validar por print o painel financeiro do colaborador e a pagina gerencial de folha com dados de competencias reais.
- Confirmar em homologacao se a importacao da folha continua sincronizando corretamente as faturas abertas apos novos lancamentos do cafe.

## Bloqueios
- `npm run lint` continua falhando por erros legados fora do escopo desta entrega, em modulos nao alterados nesta tarefa.
- `npm run build` ainda precisa ser executado apos a rodada final de ajuste e depende do estado global atual do repositorio.

## Versao do sistema
Conectarte v0.9 com caixa do Ballet Cafe preparado para venda retroativa, conta interna do colaborador por competencia, painel financeiro do colaborador e integracao com folha via fatura/cobranca canonica.

## Proximas acoes
- Homologar o fluxo completo de caixa do cafe com venda retroativa, pagamento parcial e faturamento para conta interna.
- Revisar permissoes administrativas para ajuste manual de competencia no envio para conta interna.
- Confirmar com a operacao financeira os cenarios de fechamento de competencia e importacao para folha.
- Produzir capturas das telas principais para revisao funcional final.
