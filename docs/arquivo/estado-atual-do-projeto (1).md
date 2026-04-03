## Modulo atual
- PDV Balé Café mobile V1 em `apps/pdv-bale-cafe`
- base mobile separada do `professor-app`
- estratégia aplicada: consumo direto das rotas existentes do PDV web do Café, sem backend paralelo

## SQL concluido
- sem alteracao de SQL nesta V1
- nenhuma migration criada
- justificativa validada:
  - `data_competencia` ja existe
  - `data_hora_venda` ja existe
  - conta interna ja existe
  - o schema atual suporta a V1
- sem alteracao de SQL nesta correcao de `data_hora_venda`

## APIs concluidas
- modulo de colaboradores financeiros reestruturado para centrar navegacao e leitura no colaborador
- novos endpoints semanticos do dominio:
  - `GET /api/financeiro/colaboradores/[colaboradorId]/painel`
  - `GET /api/financeiro/colaboradores/[colaboradorId]/competencias`
  - `GET /api/financeiro/colaboradores/[colaboradorId]/conta-interna`
- `GET /api/financeiro/colaboradores` passou a devolver resumo operacional do mes atual por colaborador:
  - competencia atual
  - total de adiantamentos do mes
  - total importado da conta interna no mes
  - saldo liquido estimado
- `GET /api/credito-conexao/faturas/[id]` e `GET /api/financeiro/credito-conexao/faturas/[id]` passaram a devolver contexto semantico do titular quando a fatura pertence a colaborador, incluindo competencia e status de importacao em folha
- criado helper compartilhado `src/lib/auth/cafeApiAccess.ts`
- rotas ajustadas para aceitar `Authorization: Bearer` sem quebrar o fluxo atual por cookie/sessao web:
  - `GET /api/cafe/categorias`
  - `GET /api/cafe/produtos`
  - `GET /api/cafe/tabelas-preco`
  - `GET /api/cafe/pagamentos/opcoes`
  - `GET /api/pessoas/busca`
  - `GET /api/cafe/caixa`
  - `POST /api/cafe/vendas`
  - `GET /api/cafe/vendas/[id]`
- dominio do cafe enriquecido para expor `operador_nome` e `operador_user_id` no historico
- detalhe da venda ajustado para priorizar `data_hora_venda` e devolver operador no recibo
- `POST /api/cafe/vendas` e dominio de criacao passaram a preencher `data_hora_venda` automaticamente com timestamp atual quando o cliente nao envia o campo

## Correcao eventos escola
- fluxo de cobranca da inscricao de evento corrigido para usar `cobrancas.origem_label` como chave idempotente do dominio, sem depender da coluna inexistente `origem_evento_inscricao_id`
- observabilidade do erro financeiro da inscricao passou a preservar `code`, `message`, `details` e `hint` de erros operacionais do backend, evitando retorno final como `erro_sem_detalhe`
- parcelamento do saldo residual na inscricao de evento voltou a respeitar as competencias configuradas da edicao tambem quando a conta escolhida e a conta interna do colaborador, mantendo a decisao dentro do dominio de eventos

## Paginas/componentes concluidos
- modulo financeiro de colaboradores reorganizado em quatro leituras:
  - lista principal em `/financeiro/colaboradores`
  - financeiro mensal individual em `/financeiro/colaboradores/[id]`
  - conta interna individual em `/financeiro/colaboradores/[id]/conta-interna`
  - folha geral por competencia em `/financeiro/folha/colaboradores`
- a home de colaboradores deixou de mandar o usuario para a listagem global de faturas ao clicar em conta interna
- a folha geral passou a atuar como visao gerencial complementar, com atalho para financeiro individual e conta interna individual do colaborador
- o detalhe da fatura agora diferencia conta interna de aluno x conta interna de colaborador sem quebrar o fluxo existente de aluno
- app Expo separado criado em `apps/pdv-bale-cafe`
- PDV web do Cafe ajustado para enviar `data_hora_venda` explicitamente ao confirmar a venda
- infraestrutura reaproveitada e adaptada:
  - auth context mobile
  - cliente HTTP com Bearer
  - persistencia local de sessao
  - cliente Supabase do app
- telas concluidas:
  - `LoginScreen`
  - `HomeScreen`
  - `VendaScreen`
  - `HistoricoDiaScreen`
  - `VendaDetalheScreen`
- componentes concluidos:
  - `ScreenShell`
  - `PrimaryButton`
  - `StatusBanner`
  - `ProductGrid`
  - `CartPanel`
- fluxo V1 coberto no app:
  - login do operador
  - resumo simples do dia
  - busca de comprador
  - catalogo com categorias e subcategorias
  - carrinho com quantidade, remocao e observacao
  - finalizacao em dinheiro, pix, cartao e conta interna
  - historico do dia
  - detalhe basico da venda
- app mobile do PDV ajustado para enviar `data_hora_venda` explicitamente no `POST /api/cafe/vendas`

## Pendencias
- validar com usuarios operacionais se a composicao de proventos/descontos da competencia individual precisa separar mais categorias alem de:
  - proventos
  - adiantamentos
  - descontos
  - consumo da conta interna
- revisar se a rota individual por competencia merece um subpath dedicado no futuro (`/competencias/[competencia]`) ou se o seletor na pagina individual ja cobre o uso real
- validar fluxo real de ponta a ponta no emulador com credenciais operacionais validas
- confirmar comportamento final de venda sem comprador, caso a regra de negocio do PDV web seja alterada no backend
- definir se o app tera icone/splash/branding final nesta primeira publicacao

## Bloqueios
- `npm run lint` global continua falhando por backlog historico amplo fora do modulo de colaboradores financeiros
- `npx tsc --noEmit` global continua falhando por inconsistencias antigas do projeto inteiro e rotas/paginas fora do escopo desta entrega
- em 2026-03-30 o teste no Android fisico via USB nao chegou a instalar o app porque:
  - `adb devices` nao listou nenhum aparelho como `device`
  - o app precisava de `.env` local proprio em `apps/pdv-bale-cafe/.env` para nao travar o login por ausencia de `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - o build nativo local no Windows falhou antes da instalacao por contaminacao de `desktop.ini` em `node_modules` e no app Android
  - depois da limpeza desses arquivos, o proximo bloqueio passou a ser operacional do ambiente Windows/Gradle/CMake: path longo e cache nativo em `node_modules`, com erros como `Filename longer than 260 characters` e `manifest 'build.ninja' still dirty after 100 tries`
- em 2026-04-02 a revisao estrutural do app Android confirmou:
  - `gradlew.bat tasks` passou com sucesso
  - o autolinking Android foi identificado como causa raiz do path longo: `android/build/generated/autolinking/autolinking.json` estava apontando `react-native-screens`, `react-native-safe-area-context` e `expo` para caminhos reais em `node_modules/.pnpm/...`
  - a solucao persistente aplicada no proprio repositorio foi:
    - `apps/pdv-bale-cafe/package.json` com `expo.autolinking.searchPaths = ["../../node_modules"]`
    - `apps/pdv-bale-cafe/android/build.gradle` com staging nativo curto e versionado em `android/.cxx/rns` e `android/.cxx/emc`, alem de `-DCMAKE_OBJECT_PATH_MAX=128` para os modulos nativos mais sensiveis
  - `:app:assembleDebug -PreactNativeArchitectures=x86_64` passou com sucesso
  - `:app:lintDebug -PreactNativeArchitectures=x86_64` passou com sucesso
  - a solucao final nao depende mais de patch manual em `node_modules`
- `npm run lint` global segue falhando por backlog historico fora do escopo do PDV mobile
- `npm run build` global segue falhando com `TypeError: Cannot read properties of undefined (reading 'length')` dentro do bundler do Next/webpack, sem apontar erro semantico direto do PDV

## Versao do sistema
- 2026-03-27
- entrega parcial: base funcional da V1 do app mobile do PDV Balé Café

## Proximas acoes
- conectar o aparelho fisico e autorizar a chave RSA ate `adb devices` listar o dispositivo como `device`
- manter `apps/pdv-bale-cafe/.env` local preenchido para permitir bootstrap/login do app mobile
- repetir `expo run:android` para validar instalacao no dispositivo ou emulador, agora que o bloqueio principal de path longo no Android Studio/Gradle foi resolvido
- validar no dispositivo ou emulador, nesta ordem:
  - login
  - carregar catalogo
  - adicionar item
  - remover item
  - finalizar em dinheiro, pix e cartao
  - validar conta interna
  - abrir historico do dia
  - abrir detalhe da venda
- investigar separadamente o erro global do `next build`
- sanear backlog global do `next lint` sem misturar com o escopo do PDV
