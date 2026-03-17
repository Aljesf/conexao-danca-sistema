## Modulo atual
Refatoracao visual e funcional do Ballet Cafe e do Financeiro de colaboradores para um padrao SaaS mais claro, separando PDV, caixa administrativo, cockpit financeiro de colaboradores e folha por competencia.

## SQL concluido
- Nenhuma nova migration nesta etapa.
- A refatoracao reaproveita a base operacional e financeira ja criada para cafe, cobrancas, recebimentos, movimento financeiro, lancamentos e faturas da conta interna.

## APIs concluidas
- Nova API agregadora: `src/app/api/financeiro/colaboradores/route.ts`.
- API de resumo financeiro do colaborador reforcada em `src/app/api/admin/colaboradores/[id]/financeiro-resumo/route.ts`.
- O resumo do colaborador agora devolve `competencias_folha` com valor por competencia, status da conta interna, status da folha e status de importacao.
- A logica central do cafe continua concentrada em `/api/cafe/caixa`, inclusive para vendas do PDV.

## Paginas/componentes concluidos
- Restauracao do PDV do Ballet Cafe em `/cafe/vendas`, com cards de produto, categorias, carrinho rapido e fechamento imediato.
- Separacao explicita entre `/cafe/vendas` (PDV) e `/cafe/caixa` (registro retroativo, baixa parcial e regularizacao operacional).
- Reorganizacao da entrada do modulo Cafe e da sidebar do contexto para priorizar `Vendas` e destacar `Caixa / Lancamentos`.
- Criacao da tela `/financeiro/colaboradores` como cockpit SaaS de colaboradores financeiros.
- Reforco da tela geral de folha para foco em competencia/processamento, com CTA para colaboradores financeiros.
- Reorganizacao do perfil do colaborador para destacar:
  - resumo financeiro;
  - acoes rapidas;
  - competencias e folhas;
  - conta interna e debitos;
  - ultimos lancamentos.
- Unificacao visual do conceito de `Conta interna`, usando `Conta interna (Cartao Conexao)` apenas quando a transicao de nomenclatura precisa ficar explicita.

## Pendencias
- Validar manualmente o fluxo do novo PDV com operacao real de balcao.
- Validar o consumo da nova API de colaboradores financeiros com base completa de colaboradores.
- Revisar, em homologacao, se a leitura de competencias e folhas atende todos os cenarios de importacao da conta interna.

## Bloqueios
- `npm run lint` continua falhando no repositorio por erros legados fora do escopo desta entrega.
- O escopo desta tarefa nao incluiu refatoracao dos erros historicos de lint em outros modulos.

## Versao do sistema
Conectarte v0.9 com:
- PDV do Ballet Cafe restaurado;
- separacao entre PDV e Caixa / Lancamentos;
- cockpit de colaboradores financeiros;
- perfil financeiro do colaborador com foco mensal;
- folha geral orientada a competencia e processamento.

## Proximas acoes
- Homologar os cinco fluxos principais:
  - `/cafe/vendas`;
  - `/cafe/caixa`;
  - `/financeiro/colaboradores`;
  - perfil financeiro do colaborador;
  - `/financeiro/folha/colaboradores`.
- Consolidar a nova nomenclatura de `Conta interna` em outras telas financeiras fora deste escopo.
- Produzir prints finais de validacao operacional e UX.
