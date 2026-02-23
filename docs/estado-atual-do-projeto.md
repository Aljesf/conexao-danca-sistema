??# estado-atual-do-projeto.md

## Módulo atual
Movimento Conexao Danca - acoes rapidas (bolsa/acao social)

---

## SQL concluído

### Crédito Conexão - lançamentos canônicos por cobrança
- Tabela `public.credito_conexao_lancamentos` atualizada com:
  - `competencia` (text)
  - `referencia_item` (text)
  - `composicao_json` (jsonb)
  - `cobranca_id` (bigint, FK ? `cobrancas.id`, ON DELETE SET NULL)
- Constraints:
  - `UNIQUE (conta_conexao_id, competencia, referencia_item)` (idempotência por item/competência)
  - `UNIQUE (cobranca_id)` (1 cobrança ? 1 lançamento)
- Índices adicionados/confirmados:
  - `(conta_conexao_id, competencia)`
  - `(referencia_item)`
  - `(cobranca_id, competencia)`
  - `(competencia)`
  - `GIN (composicao_json)`

### Documentos - contrato e ficha financeira (matricula pagante)
- Migration: `20260112_000200_documentos_variaveis_contrato_ficha.sql`.
- Variaveis novas (aluno/responsavel/matricula/turma/escola/manual + financeiro snapshot).
- Colecao `MATRICULA_PARCELAS` padronizada (vencimento/descricao/valor_centavos/status + valor BRL).
- Modelos: Contrato + Ficha Financeira vinculados ao conjunto MATRICULA_REGULAR/DOCUMENTO_PRINCIPAL.

### Financeiro - cobrancas avulsas (entrada adiada)
- Migration: `20260113_180101_financeiro_cobrancas_avulsas.sql` (tabela + indices + trigger updated_at).

### Movimento - formularios e acoes sociais
- Migration: `20260114_235500_movimento_refactor_formularios_e_acoes.sql` (beneficiarios + concessoes + formularios A/B/C + acoes sociais).
### Movimento - beneficiarios sem requisito de ASE
- Migration: 20260204_180047_movimento_beneficiarios_sem_requisito_ase.sql (remove travas/trigger de ASE).
### Movimento - beneficiarios com exercicio e validade
- Migration: 20260205_142435_movimento_beneficiarios_exercicio_validade.sql (adiciona exercicio_ano e valido_ate).

### Movimento - beneficiarios (analise_id opcional)
- Migration: 20260124_movimento_beneficiarios_analise_id_opcional.sql (permite cadastro sem analise_id).


### Loja - codigo automatico de produto
- Migration: `20260115_130001_loja_produtos_codigo_auto.sql` (sequence + trigger para codigo EVID-XXXXXX-SLUG).

### Loja - listas de demanda (itens com pessoa)
- Migration: `20260115_180000_loja_listas_demanda_itens_pessoa.sql` (pessoa_id em itens + indices).


---

## APIs concluídas

### Crédito Conexão - padrão "Cobrança ? Lançamento ? Fatura"
- Padronização do fluxo:
  - Cobranças elegíveis ao Cartão Conexão (por competência) geram lançamentos via `cobranca_id`.
  - `referencia_item` determinística no formato `cobranca:<id>`.
- Rebuild e fechamentos atualizados:
  - critério primário por `cobranca_id` + competência
  - fallback legado mantido quando `cobranca_id` estiver nulo (apenas histórico).
- Helper novo:
  - `upsertLancamentoPorCobranca` (server-side) para garantir idempotência e rastreabilidade.

### Matrículas - múltiplas Unidades de Execução (Caminho A consolidado)
- Matrícula com múltiplas UEs passa a gerar:
  - 1 cobrança elegível por competência com valor consolidado
  - 1 lançamento no Cartão Conexão com valor consolidado
  - `composicao_json` contendo detalhamento por UE (valores por item)
- Resultado final validado em UI:
  - fatura mostra 1 lançamento (ex.: R$ 400,00)
  - composição disponível para auditoria (220 + 180)

### Documentos - emissao contrato/ficha (matricula pagante)
- Contexto de emissao inclui escola, snapshot financeiro normalizado e parcelas padronizadas.
- Colecao MATRICULA_PARCELAS agora retorna VENCIMENTO/VALOR_CENTAVOS/STATUS (com aliases DATA/VALOR).
- Preview de documentos emitidos: API retorna HTML decodificado quando detectar conteudo escapado (ex.: &lt;h).
- Preview emitidos: GET /api/documentos/emitidos/[id] aceita mode=raw/resolved para retornar HTML sem resolver ou resolvido.
- Resolver de emitidos reconstrui contexto via matricula (mesmo pipeline da emissao).
- Resolver MATRICULA_CURSOS: busca por matricula_id com fallback por aluno_pessoa_id (turma_aluno) e filtro de ativos por dt_fim.

### Matriculas - excecao adiar primeiro pagamento
- Liquidacao gera cobranca avulsa (fora do Cartao Conexao) com vencimento manual; sem recebimento automatico.
- API de listagem: GET /api/financeiro/pessoas/[pessoaId]/cobrancas-avulsas.
- API de contas a receber: GET /api/financeiro/cobrancas-avulsas.

### Movimento Conexao Danca - beneficiarios e acoes
- API: POST /api/movimento/beneficiarios/upsert.
- API: GET /api/movimento/beneficiarios/[id]/pendencias-formulario.
- API: POST /api/movimento/acoes.
- API: POST /api/movimento/acoes/[id]/participantes.
### Movimento - beneficiarios (cadastro manual)
- API: POST /api/admin/movimento/beneficiarios (manual, sem ASE/formularios obrigatorios).
### Movimento - beneficiarios (exercicio/validade)
- API: POST /api/admin/movimento/beneficiarios (aceita exercicio_ano e valido_ate).


### Movimento - beneficiarios (listagem/detalhe)
- API: GET /api/admin/movimento/beneficiarios (join com pessoas).
- API: GET /api/admin/movimento/beneficiarios/[id] (detalhe corrigido).

### Movimento - beneficiarios (validacao banco)
- API: POST /api/admin/movimento/beneficiarios retorna 400 quando validacao do banco (P0001).


### Loja - categorias e subcategorias
- API: GET/POST /api/loja/categorias.
- API: GET/POST /api/loja/subcategorias.

### Loja - variantes
- API: POST /api/loja/variantes (criacao de variante + SKU automatico).

### Loja - listas de demanda (buscas e resumo)
- API: GET /api/loja/listas-demanda (retorna ativas/encerradas).
- API: GET/PATCH /api/loja/listas-demanda/[id].
- API: POST /api/loja/listas-demanda/[id]/itens (inclui pessoa_id).
- API: GET /api/loja/listas-demanda/[id]/resumo.
- API: GET /api/loja/listas-demanda/[id]/detalhe (itens enriquecidos + resumo).
- API: GET /api/loja/produtos/busca.
- API: GET /api/loja/produtos/[id]/variacoes.
- API: GET /api/pessoas/busca.



---

## Páginas / componentes concluídos

### Admin - Faturas do Cartão Conexão
- Exibição consistente do total e do(s) lançamento(s)
- Suporte a composição (`composicao_json`) para auditoria do consolidado (Caminho A)

### Admin - Produtos
- /admin/loja/produtos (cadastro completo + estoque inicial + variantes).

### Loja - listas de demanda (itens)
- /loja/listas-demanda/[id] (layout padrao, nomes no lugar de IDs, resumo e Destinatario opcional).

### Formularios publicos
- Formularios publicos padronizados com renderer canonico (PublicFormWizard) em todas as rotas publicas.
- Rota publica antiga removida (mantida apenas a rota canonica).

### Formularios - status canonico por envio
- Formularios: status operacional baseado em submitted_at (evento de envio final) + UI exibe Respondidas: X e filtros por status.
### Formularios - revisao manual
- Formularios: revisao manual auditavel (review_status/reviewed_at/reviewed_by) + status_final priorizando revisao; filtros e acao "Marcar como OK".



### Escola - Matrícula Nova / Liquidação
- Resumo calcula total por múltiplas UEs (ex.: 220 + 180)
- Integração com Cartão Conexão gera cobrança/lançamento consolidado corretamente
- Excecao "adiar primeiro pagamento" gera cobranca avulsa com vencimento manual (fora do Cartao Conexao)

### Pessoas - resumo financeiro
- Painel exibe cobrancas avulsas pendentes com vencimento, status, meio e motivo.

### Financeiro - Contas a Receber
- Lista inclui cobrancas avulsas geradas pela excecao de entrada.

### Movimento - acoes rapidas
- Modal de acoes rapidas (bolsa/acao social) integrado ao botao flutuante do Movimento.
### Movimento - beneficiarios (busca padronizada)
- /admin/movimento/beneficiarios: busca de pessoas alinhada ao top bar, com estado neutro para sem resultados.
### Movimento - beneficiarios (UI e validade)
- /admin/movimento/beneficiarios: textos atualizados para Movimento Conexao Banco e campos exercicio/validade no cadastro.


### Movimento - beneficiarios (lista/detalhe)
- /admin/movimento/beneficiarios: lista com nome da pessoa e status legivel.
- /admin/movimento/beneficiarios/[id]: detalhe com link para pessoa.

### Registro de Observacoes Operacionais (NASC)
- Botao flutuante + API + export CSV (MVP)

### Documentos - variaveis
- Sem ajustes necessarios: origens ESCOLA e MANUAL ja disponiveis na tela.

### Documentos - preview emitidos (admin)
- Renderizacao do preview usa HTML (emitido com fallback de modelo) com decode controlado quando necessario.
- Toggle de preview: modelo sem dados x resolver com dados, sem sobrescrever o editor; imprimir usa o modo resolvido.
- Aviso quando preview resolvido ainda contem placeholders ({{ ... }}).
- Impressao/PDF: CSS print remove max-width e define @page A4 com margem base 10mm.
- Impressao/PDF: altura efetiva de header/footer zerada quando nao ha template.


---

## Pendências

1) Matriculas - excecao adiar primeiro pagamento
- Validar liquidacao com vencimento manual (gera cobranca avulsa).
- Confirmar cobranca aparece em Contas a Receber e no Relatorio financeiro do aluno.
- Confirmar nao gera fatura do Cartao Conexao.

2) Loja - parcelamento e integração com Cartão Conexão
- Garantir que venda parcelada gere N cobranças (1 por competência/parcela), elegíveis ao Cartão Conexão.

3) NEOFIN - validação de integração
- Confirmar que a geração de boleto continua ligada apenas à cobrança da fatura:
  - `credito_conexao_faturas.cobranca_id`
  - `cobrancas.origem_tipo = 'CREDITO_CONEXAO_FATURA'`
- Garantir que cobranças "itens" (matrícula/loja/café) NÃO gerem boletos no NEOFIN.

4) Validação técnica
- Rodar `npm run lint` e `npm run build` sem erros após as alterações recentes.

5) Documentos - validacao/prints
- Aplicar migration no Supabase e emitir Contrato + Ficha Financeira.
- Gerar prints: placeholders ESCOLA_* resolvidos e parcelas com vencimento/BRL.

6) Documentos - preview HTML
- Rodar diagnostico no SQL Editor (documentos_modelo/documentos_emitidos) e validar emitidos 12/13 (resolver com dados) e doc emitido ID=13 / modelo 41.

7) Documentos - impressao/PDF
- Validar emitidos/12 com preview de impressao (largura normal, margem 10mm, sem reserva de header/footer quando vazio).

8) Movimento - buscas e navegacao
- Validar busca de pessoas no modal (usa /api/pessoas?search) e ajustar se necessario.


---

## Bloqueios
- BLOQUEIO: npm run lint falha por erros pre-existentes (no-explicit-any, hooks deps, no-unused-vars, etc.) em varios arquivos fora do escopo desta entrega.

---

## Versão do sistema
Sistema Conexão Dança - Crédito Conexão / Matrículas
Versão lógica: v1.1 (cobrança canônica + composição + múltiplas UEs consolidado)

---

## Próximas ações

1) Ajustar Loja: cobrança por parcela/competência (Cartão Conexão)
2) Validar integração NEOFIN (somente fatura)
3) Rodar lint/build e corrigir eventuais avisos do TS/ESLint

---

## Atualizacoes recentes (Calendario - 2026-01-06)

SQL concluido:
- 20260105_0001_calendario_periodo_letivo_mvp.sql (periodos_letivos + calendario_itens_institucionais)
- 20260105_0002_eventos_internos_mvp.sql (eventos_internos com datetime)

APIs concluidas:
- GET /api/calendario/feed (inclui EVENTO_INTERNO)
- GET /api/calendario/grade

Paginas:
- /calendario (MVP com periodo letivo, itens institucionais e eventos internos)

Pendencias:
- Aplicar migrations no Supabase e validar feed/grade na UI.
- Rodar npm run lint e npm run build.

---

## Atualizacoes recentes (Academico - Periodos Letivos - 2026-01-06)

SQL concluido:
- 20260106_0004_periodos_letivos_faixas_e_excecoes.sql (periodos_letivos_faixas)

APIs concluidas:
- GET/POST /api/academico/periodos-letivos
- GET/PUT /api/academico/periodos-letivos/:id
- POST /api/academico/periodos-letivos/:id/faixas
- POST /api/academico/periodos-letivos/:id/excecoes

Paginas:
- /escola/academico/periodos-letivos (dashboard/lista)
- /escola/academico/periodos-letivos/novo (criacao)
- /escola/academico/periodos-letivos/[id] (construtor: faixas + excecoes)

Navegacao:
- Link no calendario: /escola/academico/periodos-letivos

---

## Atualizacoes recentes (Pessoas - CPF - 2026-01-08)

SQL concluido:
- 20260108_0001_pessoas_cpf_validacao.sql (normalizacao de cpf + check 11 digitos + indice unico parcial)

APIs concluidas:
- Validador compartilhado de CPF (src/lib/validators/cpf.ts).
- Upsert de pessoa: CPF opcional, mas validado quando preenchido.
- Roles: bloqueio para atribuir RESPONSAVEL_FINANCEIRO sem CPF valido.

Paginas:
- /pessoas/novo e /pessoas/[id] com mascara de CPF, feedback de validade e envio normalizado.

Pendencias:
- Validar por prints:
  1) salvar pessoa com CPF vazio (ok)
  2) salvar pessoa com CPF invalido (bloqueia)
  3) atribuir RESPONSAVEL_FINANCEIRO sem CPF (bloqueia)
  4) atribuir RESPONSAVEL_FINANCEIRO com CPF valido (ok)
- Rodar npm run lint e npm run build sem erros.

---

## Atualizacoes recentes (Diario de classe - chamada obrigatoria - 2026-01-08)

SQL concluido:
- 2026-01-08__frequencia__aula-fechamento.sql (colunas fechada_em e fechada_por em turma_aulas)

APIs concluidas:
- GET /api/professor/diario-de-classe/aulas/:aulaId
- POST /api/professor/diario-de-classe/aulas/:aulaId/fechar (valida pendencias)
- POST /api/professor/diario-de-classe/aulas/:aulaId/reabrir (admin)

Paginas:
- /escola/diario-de-classe: status PENDENTE/FECHADA, botao Fechar chamada e pendencias de hoje

Pendencias:
- Aplicar migration no Supabase.
- Gerar prints obrigatorios do fluxo de chamada pendente/fechada.
- Plano executavel: docs/execucao/plano-executavel-diario-de-classe.md.

---

## Documentos normativos

- Modulo Alunos - reestruturacao conceitual e plano de implementacao: docs/modulos/modulo-alunos-reestruturacao-conceito-e-implementacao.md





---

## Atualizacao recente (2026-02-14) - Cobranca por Provedor

SQL:
- Migration `supabase/migrations/20260214_01_financeiro_cobranca_provider.sql` criada.
- Nova tabela `public.financeiro_config_cobranca` (provider ativo + dias permitidos de vencimento).
- Nova coluna `public.credito_conexao_contas.dia_vencimento_preferido` (1..28) com constraint e comentario.

API:
- Nova interface plugavel de provider:
  - `src/lib/financeiro/cobranca/providers/types.ts`
  - `src/lib/financeiro/cobranca/providers/index.ts`
  - `src/lib/financeiro/cobranca/providers/neofinProvider.ts`
- Novo util central de vencimento:
  - `src/lib/financeiro/creditoConexao/vencimento.ts`
- Novo endpoint manual por fatura:
  - `POST /api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- Ajuste na rota de fechamento da fatura (`/fechar`):
  - reforco de idempotencia por `origem_tipo=CREDITO_CONEXAO_FATURA` + `origem_id`
  - calculo de vencimento do aluno usando util central
  - terminologia de erro atualizada para cobranca

UI:
- Detalhe da fatura (`src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`):
  - botao "Gerar cobranca agora"
  - modal com dia 1..28 + opcao "Salvar como preferencia"
  - chamada do endpoint `/gerar-cobranca`
- Governanca de cobrancas por provedor:
  - `src/app/(private)/admin/governanca/boletos-neofin/page.tsx` atualizado para linguagem "Cobrancas (Provedor)"
  - filtro por provider/status
  - `src/app/api/governanca/boletos-neofin/route.ts` inclui campo `provider` e filtro `provider`

---

## Atualizacao 2026-02-16 (Credito Conexao)

### SQL
- Migration adicionada: `supabase/migrations/20260216070000_add_dia_vencimento_preferido_credito_conexao_contas.sql`.
- Objetivo: garantir coluna `credito_conexao_contas.dia_vencimento_preferido` com check `1..28` (aceitando `null`).

### API
- Endpoints ajustados para evitar erro mascarado de "fatura nao encontrada":
  - `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
  - `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- Busca da conta passou a ser separada da busca da fatura; erro de query agora retorna `500` com detalhe.
- `404` fica restrito a fatura realmente inexistente.
- `dia_vencimento_preferido` permanece tratado como opcional (`null`) com validacao `1..28` ao salvar preferencia.

### Frontend
- Ajuste de robustez no ID da rota da fatura:
  - `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
- Removeu diagnostico temporario (`/api/health`) dos handlers de fechar/gerar cobranca.

### Validacao
- `npm run build`: OK.
- `npm run lint`: falha por erros preexistentes em outros modulos (nao relacionados a este ajuste).
- Aplicacao da migration nao executada localmente neste ambiente: `supabase` CLI nao instalado (`command not found`).

---

## Atualizacao 2026-02-16 (UI Contexto)

### Paginas / componentes concluidos
- Dropdown de Contexto (topo): alinhado ao padrao do Sidebar com emojis e config centralizada em `src/config/contextosConfig.ts`.

---

## Atualizacao 2026-02-16 (Fechamento mensal configuravel de faturas)

### SQL
- Nova migration: `supabase/migrations/20260216190000_financeiro_config_fechamento_faturas.sql`.
- Nova tabela singleton `public.financeiro_config` com:
  - `id=1` como registro canonico.
  - `dia_fechamento_faturas` (1..28), default `1`.
  - trigger de `updated_at` com `public.set_updated_at()`.
- Compatibilidade de status em faturas:
  - check `credito_conexao_faturas_status_chk` atualizado para aceitar `FECHADA`.

### API
- Nova rota `GET|POST /api/financeiro/config`:
  - GET retorna `dia_fechamento_faturas`.
  - POST salva `dia_fechamento_faturas` validando `1..28`.
- Nova rota `POST /api/financeiro/credito-conexao/faturas/fechamento-automatico`:
  - le configuracao de fechamento mensal em `financeiro_config`.
  - respeita o dia configurado (ou `force=true`).
  - retorna lote elegivel de faturas `ABERTA` (ALUNO, competencia anterior ao periodo atual) em `dry_run`.
- Ajuste nas rotas unitarias de fatura:
  - `/api/financeiro/credito-conexao/faturas/[id]/fechar`
  - `/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca`
  - ambas agora gravam `data_fechamento` no dia efetivo da operacao.

### UI
- Nova pagina: `/admin/financeiro/configuracoes`
  - campo de configuracao para `dia_fechamento_faturas`.
  - leitura/salvamento via `/api/financeiro/config`.
- Sidebar Admin atualizado com item:
  - `Configuracoes do financeiro` em `src/config/sidebar/admin.ts`.

---

## Atualizacao 2026-02-16 (Cafe - Categorias, Subcategorias e PDV por botoes)

### SQL
- Nova migration: `supabase/migrations/20260216203000_cafe_categorias_subcategorias.sql`.
- Criadas as tabelas:
  - `public.cafe_categorias`
  - `public.cafe_subcategorias`
- Ajustes em `public.cafe_produtos`:
  - `categoria_id` (FK para `cafe_categorias`)
  - `subcategoria_id` (FK para `cafe_subcategorias`)
- Compatibilidade mantida com o campo legado textual `categoria`.
- Backfill inicial executavel via migration:
  - cria categorias a partir de `cafe_produtos.categoria`
  - preenche `cafe_produtos.categoria_id` quando vazio.

### APIs
- Novas rotas de categorias do Cafe:
  - `GET|POST|PUT /api/cafe/categorias`
  - `GET|POST /api/cafe/categorias/[id]/subcategorias`
  - `PUT /api/cafe/subcategorias`
- Rotas de produtos do Cafe atualizadas:
  - `POST /api/cafe/produtos` agora aceita `categoria_id` e `subcategoria_id`
  - `PUT /api/cafe/produtos/[id]` agora aceita `categoria_id` e `subcategoria_id`
  - `GET /api/cafe/produtos` retorna `categoria_id`, `subcategoria_id`, `categoria_nome` e `subcategoria_nome`.
- Guard/seguranca:
  - rotas novas seguem padrao com `guardApiByRole`.

### UI
- Novo tipo compartilhado:
  - `src/types/cafeCategorias.ts`.
- Novo hook de categorias:
  - `src/lib/cafe/useCafeCategorias.ts`.
- PDV Cafe (`/cafe/vendas`) atualizado para fluxo de toque rapido:
  - barra horizontal de categorias
  - barra de subcategorias quando aplicavel
  - grade mobile-first de produtos clicaveis para adicionar item.
- Admin Cafe Produtos (`/admin/cafe/produtos`) atualizado:
  - criacao de produto com categoria obrigatoria e subcategoria opcional
  - edicao de classificacao (categoria/subcategoria) por produto selecionado.

### Validacao
- Lint escopado dos arquivos deste patch: OK.
- `npm run build`: OK.
---

## Atualizacao 2026-02-16 (Admin Categorias do Cafe)

### API
- `GET /api/cafe/categorias` atualizado com suporte a `include_inativas=1`.
- Novo endpoint `POST /api/cafe/categorias/[id]/mover-produtos`:
  - move produtos de uma categoria para outra
  - limpa `subcategoria_id` para evitar vinculo invalido no destino.

### UI
- Nova tela administrativa: `/admin/cafe/categorias`.
  - listar categorias ativas/inativas
  - criar categoria
  - renomear categoria
  - desativar/reativar categoria
  - mover produtos entre categorias.
- Hub Admin Cafe (`/admin/cafe`) com novo atalho para `Categorias`.
- Tela de produtos (`/admin/cafe/produtos`) com atalhos:
  - `Gerenciar categorias`
  - `+ Nova categoria` (criacao rapida por prompt, com recarga e selecao da nova categoria).

### Validacao
- Lint escopado dos arquivos alterados: OK.
- `npm run build`: OK.
---

## Atualizacao 2026-02-20 (NASC - Triagem Admin de Suporte)

### SQL
- Migration criada: `supabase/migrations/20260220_01_nasc_observacoes_triagem_admin.sql`.
- Ajustes em `public.nasc_observacoes`:
  - `status` com estados `ABERTO | EM_ANALISE | EM_ANDAMENTO | RESOLVIDO | FECHADO`
  - `triagem_notas`
  - `updated_at` + trigger de atualizacao
- Indices adicionados para triagem: `status` e `updated_at desc`.

### API
- `GET /api/admin/suporte/tickets` para inbox de triagem (filtro por `status` e `q`).
- `GET /api/admin/suporte/tickets/[id]` para detalhe tecnico do relato.
- `PUT /api/admin/suporte/tickets/[id]` para atualizar status e notas de triagem.

### UI
- Nova lista administrativa: `/administracao/suporte`.
- Nova pagina de detalhe: `/administracao/suporte/[id]`.
- Atalho no sidebar admin em Governanca & Auditoria: `Suporte (NASC)`.

### Observacao
- O botao flutuante existente (`/api/nasc/observacoes`) foi mantido como canal de entrada dos relatos.
