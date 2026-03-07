## Matriculas - Cancelamento x Conclusao + Frequencia + Cartao Conexao (2026-02-09)
- Ajustado fluxo: CANCELAR matricula marca status CANCELADA e exibe detalhes (tipo/motivo/data).
- Frequencia: apenas ATIVAS entram no painel de presenca; canceladas/concluidas vao para Historico.
- Financeiro: cancelamento encerra cobrancas futuras nao pagas e elimina previsoes futuras do Cartao Conexao ligadas a matricula.

---

## Atualizacoes recentes (Perfil do Colaborador + Folha UX + Cartao Conexao) - 2026-02-11

APIs concluidas:
- GET /api/admin/colaboradores/opcoes
  - Lista colaboradores para selecao operacional na folha (sem digitar ID manual).
- GET /api/admin/colaboradores/[id]/resumo-financeiro
  - Retorna conta Cartao Conexao (COLABORADOR), fatura aberta do periodo atual, resumo de lancamentos do mes,
    ultimas despesas e folhas recentes com calculo de liquido.
- GET /api/admin/colaboradores/[id]/folhas
  - Lista folhas do colaborador por competencia/status com proventos, descontos e liquido.
- GET /api/admin/folha/colaboradores (ajustado)
  - Mantem filtros por competencia/status/colaborador e agora retorna colaborador_nome no payload.

Paginas concluidas:
- /admin/colaboradores/[id]
  - Nova tela "Perfil do Colaborador" com abas:
    1) Visao geral
    2) Cartao / Despesas
    3) Folha
    4) Jornada (com link para modulo existente)
- /admin/financeiro/folha/colaboradores (ajustada)
  - Removido input manual de colaborador_id.
  - Adicionado select de colaborador por nome.
  - Adicionado filtro por status.
  - Adicionado atalho para o Perfil do Colaborador.

Pendencias:
- Jornada/ponto de colaborador ainda sem fluxo operacional completo (tela atual segue como referencia de implementacao futura).
- Fechamento mensal em lote de folha (por competencia para multiplos colaboradores) ainda nao implementado.
- Captura de prints depende de execucao manual autenticada no ambiente local.

---

## Atualizacoes recentes (Entrega 1 - Modulo Colaborador) - 2026-02-11

SQL:
- Nova migration: `supabase/migrations/20260211074000_colaborador_remuneracoes_pagamentos.sql`.
- Nova tabela `colaborador_remuneracoes` com vigencia, salario base e conta financeira origem.
- Nova tabela `colaborador_pagamentos` para historico operacional (pagamento/adiantamento/saque), com vinculo opcional a folha/evento.
- Indices adicionados para consultas por colaborador/data e competencia.

APIs concluidas:
- `GET|POST /api/admin/colaboradores/[id]/remuneracao`
  - Consulta historico + ativa e cria/substitui remuneracao ativa.
- `GET|POST /api/admin/colaboradores/[id]/pagamentos`
  - Lista historico e registra pagamento/adiantamento/saque.
  - Suporte opcional para:
    - gerar desconto em folha (ADIANTAMENTO/SAQUE),
    - gerar saida em `movimento_financeiro`.

Paginas concluidas:
- `/admin/colaboradores/[id]`
  - Nova aba **Remuneracao** com:
    - cadastro de salario base/vigencia/conta origem,
    - registro de pagamentos e adiantamentos,
    - listagem de historico.
- `/admin/financeiro/folha/colaboradores/[id]`
  - Acao rapida: **Adicionar salario base do cadastro** (provento), evitando digitacao manual.
- `/cafe/vendas`
  - UX ajustada para exibir rotulos explicitos:
    - Cartao Conexao Aluno
    - Cartao Conexao Colaborador

Pendencias futuras:
- Encargos e integracao contabil completa (INSS, DARF, provisoes).
- Fechamento mensal em lote de folha por competencia.
- Painel operacional completo de jornada/ponto integrado a folha.

---

## Atualizacoes recentes (Governanca de Cobrancas + UX Fatura) - 2026-02-16

SQL:
- Sem mudancas de schema nesta etapa.

API:
- Nova rota `GET /api/governanca/cobrancas`:
  - Padrao de governanca para listagem de cobrancas.
  - Nao filtra "somente integradas" por padrao (mostra tambem cobrancas sem `neofin_charge_id`).
  - Retorna campos operacionais: `id`, `pessoa_nome`, `descricao`, `vencimento`, `valor_centavos`, `status`, `neofin_charge_id`, `link_pagamento`, `linha_digitavel`, `created_at`.
- Nova rota `GET /api/governanca/cobrancas/[id]`:
  - Detalhe de cobranca para auditoria, incluindo `neofin_payload`.
- Nova rota `GET|POST /api/governanca/cobrancas/[id]/sincronizar-neofin`:
  - Consulta estado remoto na NeoFin via `getNeofinBilling`.
  - Atualiza status local, payload e dados de pagamento (`link_pagamento`/`linha_digitavel`) quando disponiveis.

UI/UX:
- `/admin/financeiro/credito-conexao/faturas/[id]`:
  - Novo botao primario "Fechar fatura e gerar cobranca" quando a fatura estiver `ABERTA`.
  - Modal "Gerar cobranca agora" com tratamento de erro real do backend (mensagem legivel em toast local).
  - Removida exibicao crua de codigos de erro no fluxo do modal.
- `/admin/governanca/cobrancas`:
  - Padronizado para consumir `/api/governanca/cobrancas`.
  - Corrigidos textos/encoding e filtro NeoFin com default em "Todos".
  - Layout responsivo com container de tabela em `overflow-x-auto`.
- `/admin/governanca/cobrancas/[id]`:
  - Acoes "Abrir no NeoFin" e "Sincronizar com NeoFin".
  - Exibicao de status local e preview resumido do ultimo payload NeoFin.

---

## Atualizacoes recentes (Painel de Cobrancas do Cartao Conexao ALUNO) - 2026-02-16

SQL:
- Sem alteracoes de SQL nesta etapa.

API:
- Nova rota `GET /api/financeiro/credito-conexao/cobrancas`:
  - Lista exclusiva de cobrancas do Cartao Conexao ALUNO.
  - Fonte: `credito_conexao_faturas` (ALUNO) + `cobrancas` vinculadas por `origem_tipo/origem_id`.
  - Retorna somente cobrancas consolidadas (`neofin_charge_id` preenchido).
  - Implementada abordagem de 2 passos (faturas -> cobrancas por origem) para evitar dependencia de join relacional direto no Supabase.

UX/Paineis:
- Nova tela `/admin/financeiro/credito-conexao/cobrancas`:
  - Colunas operacionais de fatura + cobranca + NeoFin.
  - Acoes: abrir fatura e detalhar cobranca.
- Sidebar Admin atualizada:
  - Item novo em Credito Conexao: `Cobrancas (ALUNO)`.

Rotas de fatura:
- `POST /api/financeiro/credito-conexao/faturas/[id]/fechar`:
  - Retorno padronizado inclui `fatura_id`, `status_fatura`, `cobranca_id`, `neofin_charge_id`.
  - Tentativa de status `FECHADA` com fallback compativel para `ABERTA` quando o check do banco antigo nao permite `FECHADA`.
- `POST /api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca`:
  - Retorno padronizado inclui `fatura_id`, `status_fatura`, `cobranca_id`, `neofin_charge_id`, `message`.
  - Quando ja existe cobranca, retorna HTTP 200 com mensagem explicita.

Tela de detalhe da fatura:
- Botao `Fechar fatura e gerar cobranca` com tratamento de erro detalhado (`status HTTP + mensagem backend`).
- Modal `Gerar cobranca agora` com tratamento de erro detalhado e refresh de dados via `router.refresh()` + reload de dados da tela.
- Logs de erro em dev:
  - `console.error("fechar-fatura erro", { status, body })`
  - `console.error("gerar-cobranca erro", { status, body })`

---

## Atualizacoes recentes (Vencimento manual + descricao de cobranca) - 2026-02-16

API:
- `POST /api/financeiro/credito-conexao/faturas/[id]/fechar`:
  - Agora aceita override manual por data completa: `vencimento_iso` (`YYYY-MM-DD`), com `dia_vencimento`, `salvar_preferencia` e `force`.
  - Se o vencimento calculado cair no passado em operacao manual e sem override/force, retorna erro orientando informar `vencimento_iso` futuro.
  - Retorno padronizado inclui: `fatura_id`, `status_fatura`, `cobranca_id`, `neofin_charge_id`, `vencimento_iso`.
- `POST /api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca`:
  - Mesmas regras de override manual e validacao de vencimento.
  - Retorno inclui ids + `vencimento_iso` + `message` para feedback direto na UI.

Descricao de cobranca:
- Novo util `src/lib/financeiro/cobranca/descricao.ts` para gerar descricao mais informativa e truncada antes do envio ao provider.
- Padrao aplicado: contexto de mensalidade + periodo + fatura + extras de itens (limitados e truncados).

UI:
- `/admin/financeiro/credito-conexao/faturas/[id]`:
  - Acao de fechar agora abre modal com `input type="date"` (override manual).
  - Modal de gerar cobranca agora tambem usa `input type="date"` (sem select apenas de dia).
  - Toasts de sucesso exibem `cobranca_id` e `vencimento_iso`.
  - Bloco operacional "Cobranca gerada" visivel mesmo quando status da fatura permanece `ABERTA` por compatibilidade de regra legada.

---

## Atualizacoes recentes (Carteira Operacional Aluno + Vinculo Manual + Dashboard Mensal SaaS) - 2026-03-07

Modulo atual:
- Financeiro / Credito Conexao com leitura operacional mensal da Conta Interna Aluno e reforco da visao mensal SaaS no dashboard financeiro.
- A carteira operacional do aluno agora inclui:
  - mensalidades
  - cobrancas avulsas
  - cobrancas sem NeoFin
  - cobrancas com falha/inconsistencia operacional de integracao
- As cobrancas do aluno agora sao lidas por competencia e por status operacional:
  - pago
  - pendente a vencer
  - pendente vencido
- Os nomes passaram a ser exibidos com label humano + id no padrao `Nome da Pessoa (#ID)`.
- NeoFin passou a ser tratado como camada operacional de cobranca, nao como criterio de existencia da divida.
- O layout foi alinhado ao padrao institucional com:
  - container central
  - card de contexto
  - card de filtros
  - cards funcionais
  - abas horizontais por competencia
  - listas dentro de cards

SQL concluido:
- Nova migration `supabase/migrations/20260306_01_financeiro_cobrancas_dashboard_refactor.sql`.
- Confirmado uso dos campos canonicos ja existentes em `public.cobrancas`:
  - `pessoa_id`
  - `competencia_ano_mes`
  - `vencimento`
  - `status`
  - `neofin_charge_id`
  - `origem_tipo`
  - `origem_subtipo`
  - `valor_centavos`
- Criados indices operacionais para:
  - competencia
  - status
  - pessoa_id
  - vencimento
  - neofin
- Criados indices auxiliares em `credito_conexao_faturas` para `periodo_referencia`, `cobranca_id`, `data_vencimento` e `neofin_invoice_id`.
- Criados indices auxiliares em `credito_conexao_contas` e `financeiro_cobrancas_avulsas` para leitura operacional por pessoa, status e vencimento.
- Criada a tabela minima `public.credito_conexao_faturas_cobrancas_avulsas` para vinculo manual rastreavel de cobrancas avulsas.
- Nova view `public.vw_financeiro_cobrancas_operacionais`:
  - preserva compatibilidade com os 20 campos antigos ja consumidos pela API
  - consolida nome da pessoa e `pessoa_label`
  - consolida competencia canonica e `competencia_label`
  - classifica `tipo_cobranca` em mensalidade, avulsa ou outra
  - expõe valor pago, saldo, atraso e `status_operacional`
  - expõe `fatura_id`, `fatura_competencia`, `neofin_status` e `neofin_situacao_operacional`
  - marca `permite_vinculo_manual` para cobrancas elegiveis
- Falha identificada na primeira execucao da migration:
  - a tabela `public.recebimentos` nao possui a coluna `status`
  - a regra canonica de confirmacao foi ajustada para `data_pagamento IS NOT NULL`
- View operacional recriada e validada com sucesso apos o ajuste.
- Validacao SQL mais recente:
  - `384` itens ALUNO na view operacional
  - `23` cobrancas avulsas ALUNO
  - `332` itens ALUNO sem vinculo NeoFin e elegiveis para vinculo manual
  - `28` itens ALUNO vinculados ao NeoFin

APIs concluidas:
- `GET /api/financeiro/credito-conexao/cobrancas`
  - refatorada para payload mensal/operacional com `resumo_geral`, `meses`, `competencias_disponiveis` e `competencia_ativa_padrao`
  - leitura direta da view operacional canonica
  - inclui mensalidades, avulsas, cobrancas sem NeoFin e falhas operacionais
  - `pessoa_label` humano com fallback apenas quando nao houver nome
  - agrupamento por competencia e status operacional
  - suporte a filtros por busca, status operacional e situacao NeoFin
  - entrega `sugestao_fatura_ids` para apoio ao vinculo manual
- `POST /api/financeiro/credito-conexao/cobrancas/vincular-fatura`
  - novo endpoint administrativo para vincular cobranca a fatura
  - valida mesma pessoa, bloqueia cobranca quitada e bloqueia conflito de vinculo direto
  - exige confirmacao explicita para competencia diferente
  - registra auditoria em `auditoria_logs`
- `GET /api/financeiro/credito-conexao/faturas/sugestoes`
  - novo endpoint para sugerir faturas da mesma pessoa
  - prioriza mesma competencia e depois competencias vizinhas
  - sinaliza quando a competencia e diferente ou a fatura ja esta ocupada
- `GET /api/financeiro/dashboard/mensal`
  - nova rota server-side para cards mensais e competencias recentes
  - entrega `previsto`, `pago`, `pendente`, `vencido`, `neofin` e `% inadimplencia`
  - agora reflete a carteira real da Conta Interna Aluno, incluindo avulsas e itens sem NeoFin
  - resposta pronta para cards e tabela de leitura rapida
- Validacao pos-fix:
  - a consulta principal da rota de cobrancas voltou a resolver a carteira operacional sem erro da view
  - a consulta principal do dashboard mensal voltou a ler a view operacional com competencias recentes e nomes reais
- Novo helper compartilhado `src/lib/financeiro/creditoConexao/cobrancas.ts`
  - `classificarStatusOperacionalCobranca`
  - `agruparCobrancasPorCompetencia`
  - `montarPessoaLabel`
  - `calcularResumoMensalFinanceiro`
  - `montarCobrancaOperacionalBase`
  - labels e normalizacao de NeoFin/tipo de cobranca

Paginas / componentes concluidos:
- `/admin/financeiro/credito-conexao/cobrancas`
  - tela reestruturada em visao mensal com abas horizontais por competencia
  - nomenclatura visivel alinhada para Conta Interna Aluno
  - filtros em card proprio
  - resumo geral em cards
  - card unico da competencia ativa com secoes internas por status operacional
  - badges de tipo de cobranca e situacao NeoFin
  - acao de vinculo manual de cobranca para fatura
  - acao de registrar recebimento mantida para cobrancas canonicas
- Novos componentes:
  - `src/components/financeiro/credito-conexao/CobrancasMensaisResumo.tsx`
  - `src/components/financeiro/credito-conexao/CobrancasCompetenciaCard.tsx`
  - `src/components/financeiro/credito-conexao/CobrancaStatusSection.tsx`
  - `src/components/financeiro/credito-conexao/CobrancaRow.tsx`
  - `src/components/financeiro/credito-conexao/CompetenciaTabs.tsx`
  - `src/components/financeiro/credito-conexao/VincularCobrancaFaturaDialog.tsx`
- `/admin/financeiro`
  - novo bloco "Saude mensal do financeiro"
  - cards mensais orientados a operacao SaaS
  - tabela de competencias recentes
  - microcopy de gestao com foco em cobranca, conversao e vinculo operacional
  - mensagens de erro controladas para leitura mensal, sem expor erro tecnico cru ao usuario
- `FinanceHelpCard`/help do dashboard atualizados para refletir:
  - visao mensal
  - previsto x pago x pendente
  - acompanhamento de cobranca NeoFin
  - leitura operacional para gestao SaaS

Validacao do escopo:
- `npx eslint` nos arquivos alterados: sucesso.
- `npm run build`: sucesso.
- Validacao SQL:
  - view operacional criada e consultada com sucesso
  - carteira ALUNO com `384` itens, sendo `23` avulsas e `28` vinculadas ao NeoFin

Pendencias:
- Captura de prints reais da UI segue dependente de sessao autenticada local; as rotas `/admin/financeiro` e `/admin/financeiro/credito-conexao/cobrancas` redirecionam para `/login` sem sessao.
- Revisao manual final recomendada com sessao autenticada e pelo menos:
  - uma aba com item pago
  - uma aba com item pendente a vencer
  - uma aba com item pendente vencido
  - um item avulso
  - um item sem NeoFin
  - um item com acao "Vincular a fatura"

Proximas acoes:
- Validar visualmente `/admin/financeiro/credito-conexao/cobrancas` e `/admin/financeiro` com sessao autenticada.
- Capturar prints finais para aprovacao funcional da carteira em abas e do dialogo de vinculo manual.
- Se desejado, estender a mesma leitura mensal para Conta Interna Colaborador e para outros paines de contas a receber que ainda consomem a view legada.
