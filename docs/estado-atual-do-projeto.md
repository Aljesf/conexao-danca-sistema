## Modulo atual
Financeiro com formas de pagamento centralizadas por contexto e centro de custo no cadastro legado canônico, Ballet Cafe e Loja consumindo essa configuracao no PDV/caixa, dashboard operacional e financeiro do Cafe, home por contexto por usuario e compatibilidade ativa com o schema real do sistema.

## SQL concluido
- `20260317_001_contexto_home_usuario_e_dashboard_cafe.sql` com preferencia de home por contexto e views analiticas do Cafe.
- `20260317_002_cafe_integracao_financeira_e_conta_interna.sql` ampliando `cafe_vendas` com metadados financeiros e vinculos canonicos.
- `20260317_003_unificacao_conta_interna_e_formas_pagamento_centrais.sql` evoluindo `formas_pagamento`, `credito_conexao_contas`, `cafe_vendas` e `loja_vendas` para o modelo central de formas e conta interna.
- `20260317_004_backfill_formas_pagamento_saas_a_partir_do_legado.sql` preparando backfill e compatibilidade do cadastro central de formas a partir de `formas_pagamento`.
- `20260317_005_seed_formas_pagamento_padrao.sql` semeando formas padrao e habilitando o contexto do Ballet Cafe no schema legado real.
- `20260317_006_parametrizacao_inicial_formas_pagamento_cafe_loja.sql` parametrizando Cafe e Loja com Mercado Pago como maquininha padrao de cartao, Pix com conta financeira de destino configurada por contexto e conta interna por perfil.

## APIs concluidas
- `/api/me/contexto-home`
- `/api/me/contexto-home/resolver`
- `/api/cafe/dashboard`
- `/api/cafe/pagamentos/opcoes`
- `/api/cafe/caixa` e alias `/api/cafe/vendas`
- `/api/financeiro/formas-pagamento-saas`
- `/api/suporte/solicitacoes-conta-interna`
- Correcoes de compatibilidade aplicadas para que `/api/cafe/pagamentos/opcoes` e `/api/cafe/dashboard` nao dependam de colunas novas ausentes no banco atual.
- A API central de formas suporta listagem e upsert explicito para criacao e edicao posterior sem quebrar vinculos de contexto e centro de custo.
- A resolucao das formas do Cafe e da Loja agora respeita a parametrizacao inicial por contexto, centro de custo, maquininha padrao e conta financeira de destino, com fallback controlado para o legado quando o schema novo ainda nao estiver completo.

## Paginas/componentes concluidos
- `/cafe` como dashboard operacional inteligente do Ballet Cafe.
- `/cafe/vendas` com meios de pagamento resolvidos por contexto, troco em dinheiro e aviso de conta interna indisponivel.
- `/cafe/vendas` agora exibe Dinheiro, Pix, Credito a vista e conta interna por perfil elegivel, com subfluxo de troco, maquininha padrao Mercado Pago e destino financeiro do Pix quando configurado.
- `/cafe/caixa` com fluxo administrativo claro para retroativo, baixa parcial, conta interna do aluno, conta interna do colaborador e conversao corretiva de saldo.
- `/financeiro/formas-pagamento` para governanca central das formas por contexto e centro de custo.
- `/financeiro/formas-pagamento` agora deixa explicito quais formas estao habilitadas em Cafe e Loja, qual maquininha padrao esta associada ao cartao e qual conta financeira padrao esta associada ao Pix.
- `/loja/caixa` foi alinhada para consumir a mesma parametrizacao central e refletir maquininha e conta financeira de destino nas formas configuradas.
- `/administracao/configuracoes/contextos` para configurar a home individual por contexto.
- `src/components/cafe/CafeDashboard.tsx` consolidando KPIs, perfis, horarios, financeiro, meios de pagamento e estoque.
- O front do Cafe agora consome fallback legado de formas de pagamento sem exibir "sem opcoes configuradas" quando o cadastro central novo ainda nao estiver populado, e aponta o operador para `Financeiro > Formas de pagamento` quando precisar revisar a configuracao.

## Pendencias
- Validacao visual final por prints em ambiente autenticado.
- Homologacao com vendas reais de aluno, responsavel financeiro e colaborador.
- Refinar a Loja para usar o mesmo resolvedor de elegibilidade de conta interna por responsavel financeiro em todo o fluxo, sem depender de adaptacoes locais residuais.
- Evoluir previsoes de reposicao com historico temporal e alertas inteligentes.
- Aplicar as migrations financeiras pendentes nos ambientes que ainda estao apenas no schema legado para persistir todos os metadados novos tambem no banco e garantir o seed padrao das formas centrais.

## Bloqueios
- Nenhum bloqueio funcional conhecido no modulo do Cafe.
- O projeto ainda possui erros legados de lint fora do escopo em modulos antigos de loja, matriculas, components e context.
- Divergencia conhecida de schema: o banco atual ainda opera com `formas_pagamento` + `formas_pagamento_contexto` e `credito_conexao_contas` sem todas as colunas novas planejadas, por isso a aplicacao esta operando com fallback e inferencia controlada.
- Divergencia operacional conhecida: no ambiente atual a conta financeira ligada a maquininha Mercado Pago tambem esta sendo usada como destino padrao do Pix quando nao existe um vinculo mais especifico por contexto.

## Versao do sistema
Conectarte v0.9 com:
- dashboard operacional do Ballet Cafe;
- home por contexto configuravel por usuario;
- PDV e Caixa apoiados pelo mesmo nucleo operacional;
- unificacao da nomenclatura de conta interna na UI;
- cadastro central de formas de pagamento reutilizavel por contexto e centro de custo;
- parametrizacao inicial da maquininha Mercado Pago para Cafe e Loja;
- fluxo de troco em dinheiro no PDV do Cafe;
- Pix com conta financeira de destino configuravel e resolvida por cadastro;
- conta interna exibida por perfil elegivel no Cafe;
- compatibilidade entre camada nova de pagamentos e legado sem quebrar o Cafe;
- tela central no Financeiro para governar as formas consumidas pelo Cafe e pela Loja.

## Proximas acoes
- Validar `/cafe`, `/cafe/vendas`, `/cafe/caixa` e `/financeiro/formas-pagamento` com dados reais.
- Validar `/loja/caixa` com a parametrizacao central e a maquininha Mercado Pago resolvida automaticamente.
- Produzir prints finais de dashboard, PDV, Caixa, conta interna e configuracao de contexto.
- Fechar a integracao completa da Loja com o resolvedor central de conta interna e suporte.
- Aplicar o backfill e o seed do cadastro central de formas nos ambientes restantes e remover os fallbacks quando o schema novo estiver plenamente presente.
