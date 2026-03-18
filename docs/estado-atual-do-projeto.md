## Modulo atual
Ballet Cafe concluido neste chat com PDV, integracao financeira, conta interna, tabela de preco, formas de pagamento centrais, recibo operacional e compatibilidade ativa com o schema real do sistema. A Loja segue consumindo a mesma configuracao central de pagamentos.

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
- Corrigida a elegibilidade da conta interna do colaborador no PDV do Cafe: o resolvedor agora identifica colaborador ativo pelo `comprador_pessoa_id`, preserva a forma `Conta interna do colaborador` no filtro final e nao cai em `NAO_IDENTIFICADO` quando a pessoa selecionada ja e um colaborador valido.
- O PDV e o Caixa do Cafe agora resolvem a conta interna do colaborador pela mesma fonte canonica usada nas faturas administrativas (`credito_conexao_contas` + faturas vinculadas), com compatibilidade para nomenclaturas legadas da conta real.
- Corrigida a regra conceitual da conta interna do colaborador: compras do Cafe entram na mesma estrutura canonica de fatura mensal usada pelo aluno, e a diferenca fica no destino da liquidacao dessa fatura (`INTEGRACAO_FOLHA_MES_SEGUINTE` para colaborador).
- `/api/cafe/tabelas-preco` passou a resolver tabela padrao por perfil e a devolver a tabela ativa do fluxo sem quebrar a listagem administrativa existente.
- O fechamento do PDV do Cafe agora envia a composicao detalhada dos itens para `credito_conexao_lancamentos.composicao_json`, permitindo leitura coerente da venda dentro da fatura do colaborador.
- O metadata das contas internas e das opcoes de pagamento agora expoe `tipo_fatura = MENSAL`, `destino_liquidacao_fatura` e `permite_parcelamento` de forma consistente para aluno e colaborador.
- `/api/cafe/vendas/[id]` agora entrega o detalhe completo da venda do Cafe em formato de recibo, com itens, competencia, referencias correlatas e total pronto para consulta e impressao.

## Paginas/componentes concluidos
- `/cafe` como dashboard operacional inteligente do Ballet Cafe.
- `/cafe/vendas` com meios de pagamento resolvidos por contexto, troco em dinheiro e aviso de conta interna indisponivel.
- `/cafe/vendas` agora exibe Dinheiro, Pix, Credito a vista e conta interna por perfil elegivel, com subfluxo de troco, maquininha padrao Mercado Pago e destino financeiro do Pix quando configurado.
- `/cafe/vendas` agora permite escolher a tabela de preco no fluxo, recalcula catalogo/carrinho conforme a tabela ativa e persiste a tabela usada na venda.
- `/cafe/vendas` recebeu polimento final de UX no card lateral: tabela ativa, liquidacao escolhida e origem dos precos ficaram explicitos no resumo do PDV.
- `/cafe/vendas` agora comunica corretamente que a conta interna do colaborador entra em fatura mensal e que a liquidacao dessa fatura integra a folha do mes seguinte.
- `/cafe/vendas/[id]` passou a funcionar como recibo operacional da venda, com impressao, consulta posterior e rastreabilidade de cobranca, fatura e conta interna.
- `/cafe/caixa` com fluxo administrativo claro para retroativo, baixa parcial, conta interna do aluno, conta interna do colaborador e conversao corretiva de saldo.
- `/cafe/caixa` agora tambem resolve tabela de preco no lancamento administrativo, mostra a tabela ativa no resumo e envia `tabela_preco_id` para persistencia da comanda.
- A fila de comandas do Caixa agora abre o recibo da venda registrada para consulta e reimpressao.
- `/financeiro/formas-pagamento` para governanca central das formas por contexto e centro de custo.
- `/financeiro/formas-pagamento` agora deixa explicito quais formas estao habilitadas em Cafe e Loja, qual maquininha padrao esta associada ao cartao e qual conta financeira padrao esta associada ao Pix.
- `/loja/caixa` foi alinhada para consumir a mesma parametrizacao central e refletir maquininha e conta financeira de destino nas formas configuradas.
- `/administracao/configuracoes/contextos` para configurar a home individual por contexto.
- `src/components/cafe/CafeDashboard.tsx` consolidando KPIs, perfis, horarios, financeiro, meios de pagamento e estoque.
- O front do Cafe agora consome fallback legado de formas de pagamento sem exibir "sem opcoes configuradas" quando o cadastro central novo ainda nao estiver populado, e aponta o operador para `Financeiro > Formas de pagamento` quando precisar revisar a configuracao.

## Pendencias
- Validacao visual final por prints em ambiente autenticado.
- Homologacao com vendas reais de aluno, responsavel financeiro e colaborador.
- Validar no ambiente autenticado a troca de tabela de preco no PDV/caixa e a persistencia correta de `tabela_preco_id` em vendas reais.
- Gerar os prints finais do PDV mostrando tabela ativa, conta interna do colaborador e resumo do carrinho em ambiente autenticado.
- Validar em navegador autenticado o recibo do Cafe, a impressao e a navegacao pos-fechamento da venda.
- Revisar gradualmente a nomenclatura legado "Cartao Conexao" nas telas administrativas antigas para refletir o conceito unificado de conta interna mensal.
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
- precificacao do Cafe conectada ao cadastro real de `cafe_tabelas_preco` e `cafe_produto_precos`;
- unificacao da nomenclatura de conta interna na UI;
- cadastro central de formas de pagamento reutilizavel por contexto e centro de custo;
- parametrizacao inicial da maquininha Mercado Pago para Cafe e Loja;
- fluxo de troco em dinheiro no PDV do Cafe;
- Pix com conta financeira de destino configuravel e resolvida por cadastro;
- conta interna exibida por perfil elegivel no Cafe;
- compatibilidade entre camada nova de pagamentos e legado sem quebrar o Cafe;
- tela central no Financeiro para governar as formas consumidas pelo Cafe e pela Loja.
- fechamento do PDV do Cafe validado com conta interna do colaborador, tabela de preco diferenciada e reflexo em fatura.

## Proximas acoes
- Validar `/cafe`, `/cafe/vendas`, `/cafe/caixa` e `/financeiro/formas-pagamento` com dados reais.
- Validar `/loja/caixa` com a parametrizacao central e a maquininha Mercado Pago resolvida automaticamente.
- Produzir prints finais de dashboard, PDV, Caixa, conta interna e configuracao de contexto.
- Fechar a integracao completa da Loja com o resolvedor central de conta interna e suporte.
- Aplicar o backfill e o seed do cadastro central de formas nos ambientes restantes e remover os fallbacks quando o schema novo estiver plenamente presente.
## 2026-03-17 - Ajustes finais do PDV do Ballet Cafe

- Corrigido o fechamento da venda do Cafe com `Conta interna do colaborador`, unificando a mesma conta interna canonica entre `GET /api/cafe/pagamentos/opcoes` e `POST /api/cafe/vendas` via rota compartilhada do Cafe.
- O PDV passou a enviar `conta_conexao_id` e `conta_interna_id` resolvidos pela API, e o backend agora valida a conta informada contra a conta canonica antes de lancar a cobranca/fatura.
- Corrigido o warning de chave duplicada `conta-nao-resolvida` na leitura financeira do dashboard do Cafe.
- Mantida a persistencia de `tabela_preco_id` e da composicao detalhada dos itens no lancamento financeiro/fatura do colaborador.

## 2026-03-17 - Regra corrigida da fatura mensal do colaborador

- Corrigida a interpretacao conceitual da conta interna do colaborador: a venda do Cafe nao liquida direto em folha no ato da compra.
- Aluno e colaborador agora estao documentados e expostos pela mesma base canonica de conta interna com `tipo_fatura = MENSAL`.
- A diferenca passa a ficar explicita no destino da liquidacao da fatura: aluno em fluxo de cobranca/pagamento da escola e colaborador em integracao com folha do mes seguinte.
- O check-up confirmou que a configuracao de parcelamento continua centralizada em `credito_conexao_regras_parcelas`, compartilhada por `ALUNO` e `COLABORADOR`.

## 2026-03-17 - Recibo e consulta posterior da venda do Cafe

- Implementado o recibo operacional em `/cafe/vendas/[id]`, com visualizacao limpa, impressao e referencias correlatas da venda.
- O fechamento do PDV do Cafe agora oferece CTA direto para abrir o recibo da venda concluida, sem deixar o operador preso em um estado ambíguo.
- A consulta posterior tambem ficou acessivel pela fila do Caixa, permitindo revisar e reimprimir vendas recentes.
- A validacao manual autenticada continua pendente neste ambiente por ausencia de sessao de navegador; a validacao de dados/backend segue obrigatoria na homologacao final.

## 2026-03-17 - Fechamento final do modulo Ballet Cafe

- Modulo encerrado neste chat com PDV, Caixa, integracao financeira, conta interna por perfil, tabela de preco no fluxo, formas de pagamento centralizadas e recibo operacional.
- O fluxo canonico de conta interna ficou consolidado para aluno e colaborador na mesma base mensal de fatura, com diferenca apenas no destino da liquidacao posterior.
- O deploy final desta etapa depende do push na branch principal e do disparo automatico configurado no Vercel, salvo necessidade operacional externa da equipe.

## 2026-03-17 - Refatoracao de Contas a Receber

- Modulo atual: Financeiro / Contas a Receber, agora reorganizado como visao de saude financeira, auditoria por devedor e origem real das dividas.
- SQL concluido: `supabase/sql/diagnosticos/20260317_contas_receber_auditoria_contextos.sql` com blocos de leitura para pessoa, devedores, contexto principal, origem detalhada, composicao de fatura do Cartao Conexao e perdas por cancelamento de matricula.
- API concluida: `GET /api/financeiro/contas-a-receber` agora retorna payload unico de auditoria com resumo, top devedores, lista completa de devedores, lista paginada de cobrancas, detalhe auditavel por cobranca, composicao de fatura e perdas por cancelamento.
- Paginas/componentes concluidos: `/admin/financeiro/contas-receber` foi reescrita; aliases antigos continuam apontando para a pagina real; novos componentes dedicados `DevedoresTable`, `CobrancasTable`, `CobrancaAuditDetail` e `PerdasCancelamentoCard` foram adicionados em `src/components/financeiro/contas-receber/`.
- Taxonomia oficial aplicada na UI e na API: contexto principal `ESCOLA | CAFE | LOJA | OUTRO`, com origem detalhada humanizada e sem usar "AVULSA" como categoria principal da leitura.
- Cartao Conexao: o detalhe da cobranca passou a exibir trilha auditavel e composicao de fatura quando a cobranca estiver vinculada a fatura canonica.
- Pendencias: homologacao visual autenticada com prints da tela principal, tabela completa de devedores, lista de cobrancas, detalhe com fatura conexao e card de perdas por cancelamento.
- Bloqueios: `npm run lint` continua falhando por erros preexistentes amplos fora do escopo em modulos antigos de loja, pessoas, matriculas e componentes; os arquivos tocados nesta refatoracao passaram em lint isolado.
- Versao do sistema: Conectarte v0.9 com Contas a Receber refatorado para auditoria financeira orientada por contexto.
- Proximas acoes: validar visualmente em sessao autenticada, gerar os prints finais do modulo e decidir se a proxima iteracao inclui cobrancas avulsas em leitura secundaria ou permanece separada do nucleo principal de auditoria.
