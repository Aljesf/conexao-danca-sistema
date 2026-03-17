## Modulo atual
Ballet Cafe com dashboard operacional e financeiro, PDV e Caixa apoiados no mesmo nucleo de comanda, home por contexto por usuario e unificacao da linguagem de conta interna na interface.

## SQL concluido
- `20260317_001_contexto_home_usuario_e_dashboard_cafe.sql` com preferencia de home por contexto e views analiticas do Cafe.
- `20260317_002_cafe_integracao_financeira_e_conta_interna.sql` ampliando `cafe_vendas` com metadados financeiros e vinculos canonicos.
- `20260317_003_unificacao_conta_interna_e_formas_pagamento_centrais.sql` evoluindo `formas_pagamento`, `credito_conexao_contas`, `cafe_vendas` e `loja_vendas` para o modelo central de formas e conta interna.

## APIs concluidas
- `/api/me/contexto-home`
- `/api/me/contexto-home/resolver`
- `/api/cafe/dashboard`
- `/api/cafe/pagamentos/opcoes`
- `/api/cafe/caixa` e alias `/api/cafe/vendas`
- `/api/financeiro/formas-pagamento-saas`
- `/api/suporte/solicitacoes-conta-interna`

## Paginas/componentes concluidos
- `/cafe` como dashboard operacional inteligente do Ballet Cafe.
- `/cafe/vendas` com meios de pagamento resolvidos por contexto, troco em dinheiro e aviso de conta interna indisponivel.
- `/cafe/caixa` com fluxo administrativo claro para retroativo, baixa parcial, conta interna do aluno, conta interna do colaborador e conversao corretiva de saldo.
- `/financeiro/formas-pagamento` para governanca central das formas por contexto e centro de custo.
- `/administracao/configuracoes/contextos` para configurar a home individual por contexto.
- `src/components/cafe/CafeDashboard.tsx` consolidando KPIs, perfis, horarios, financeiro, meios de pagamento e estoque.

## Pendencias
- Validacao visual final por prints em ambiente autenticado.
- Homologacao com vendas reais de aluno, responsavel financeiro e colaborador.
- Refinar a Loja para usar o mesmo resolvedor de elegibilidade de conta interna por responsavel financeiro, sem depender de filtros locais.
- Evoluir previsoes de reposicao com historico temporal e alertas inteligentes.

## Bloqueios
- Nenhum bloqueio funcional conhecido no modulo do Cafe.
- O projeto ainda possui erros legados de lint fora do escopo em modulos antigos de loja, matriculas, components e context.

## Versao do sistema
Conectarte v0.9 com:
- dashboard operacional do Ballet Cafe;
- home por contexto configuravel por usuario;
- PDV e Caixa apoiados pelo mesmo nucleo operacional;
- unificacao da nomenclatura de conta interna na UI;
- cadastro central de formas de pagamento reutilizavel por contexto e centro de custo.

## Proximas acoes
- Validar `/cafe`, `/cafe/vendas`, `/cafe/caixa` e `/financeiro/formas-pagamento` com dados reais.
- Produzir prints finais de dashboard, PDV, Caixa, conta interna e configuracao de contexto.
- Fechar a integracao completa da Loja com o resolvedor central de conta interna e suporte.
