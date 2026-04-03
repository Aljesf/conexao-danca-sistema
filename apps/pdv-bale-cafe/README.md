# PDV Bale Cafe

App mobile de operacao do balcao do Bale Cafe, baseado em Expo SDK 54, React Native 0.81 e Android nativo gerado em `android/`.

## Stack

- Expo SDK 54
- React Native 0.81
- React Navigation 7
- Supabase JS 2
- Android Gradle Plugin via template Expo
- Kotlin/Gradle Groovy no projeto Android

## Android minimo

- `minSdk = 24`
- `targetSdk = 36`
- JDK 17 via Android Studio (`jbr`) para sync e build

## Como abrir no Android Studio

1. Rode `pnpm --dir apps/pdv-bale-cafe install`
2. Abra a pasta `apps/pdv-bale-cafe/android` no Android Studio
3. Aguarde o Gradle Sync
4. Se houver lixo do Windows em recursos, rode `gradlew.bat clean` ou qualquer build; o projeto remove `desktop.ini` automaticamente no `preBuild`
5. Em workspace limpo no Windows, mantenha a instalacao via `pnpm` e nao aplique patch manual em `node_modules`; o app ja resolve o autolinking Android pelo `node_modules` curto da raiz e mantem staging nativo curto em `android/.cxx/`

## Comandos uteis

- `cd apps/pdv-bale-cafe/android`
- `gradlew.bat tasks`
- `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64`
- `gradlew.bat :app:lintDebug -PreactNativeArchitectures=x86_64`
- `pnpm --dir apps/pdv-bale-cafe android:rebuild`

## Configuracao de ambiente

O app usa o arquivo `apps/pdv-bale-cafe/.env` para Expo/JS e expoe os mesmos valores no Android via `BuildConfig`.

Variaveis principais:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_TIMEOUT_MS`

Pontos centralizados:

- JS/TS: `src/config/env.ts`
- Android nativo: `android/app/src/main/java/com/conexaodados/pdvbalecafe/core/config/AppConfig.kt`
- Gradle/buildConfigField: `android/app/build.gradle`

Fallbacks atuais:

- `EXPO_PUBLIC_API_BASE_URL`: `https://conexaodanca.art.br`
- `SUPABASE_*`: sem fallback funcional; configure no `.env`

## Pastas principais

- `android`: projeto Android nativo para Android Studio
- `src/mobile`: navegacao, telas e componentes mobile
- `src/lib`: clientes de API, auth e Supabase
- `src/config`: configuracao de ambiente do app

## Ajuste persistente para Windows

- Causa raiz identificada: o autolinking Android do Expo/React Native gerava `android/build/generated/autolinking/autolinking.json` com `sourceDir` e `cmakeListsPath` apontando para caminhos reais em `node_modules/.pnpm/...`, principalmente em `react-native-screens`
- Esse caminho longo e instavel contaminava o CMake/Ninja no Windows durante `configureCMakeDebug` e `buildCMakeDebug`
- Solucao aplicada no repositorio:
- `package.json`: `expo.autolinking.searchPaths = ["../../node_modules"]` para forcar a resolucao de bibliotecas nativas pelo `node_modules` curto da raiz
- `android/build.gradle`: override versionado para manter staging nativo curto em `android/.cxx/rns` e `android/.cxx/emc`, com `-DCMAKE_OBJECT_PATH_MAX=128` para `react-native-screens` e `expo-modules-core`
- Resultado: o build deixa de depender de patch manual em `node_modules` e continua reproduzivel apos reinstalacao limpa

## Status atual

- Gradle Sync: funcional apos reinstalar dependencias do app
- Configuracao: URLs e chaves centralizadas para JS e Android
- `gradlew.bat tasks`: validado com sucesso em `2026-04-02`
- `:app:assembleDebug -PreactNativeArchitectures=x86_64`: validado com sucesso em `2026-04-02`
- `:app:lintDebug -PreactNativeArchitectures=x86_64`: validado com sucesso em `2026-04-02`

## Pendencias conhecidas

- O repositorio usa `pnpm` em workspace; se os links de `node_modules` estiverem quebrados, rode novamente `pnpm --dir apps/pdv-bale-cafe install`
- O build nativo no Windows ainda pode sofrer com caches/artefatos do Explorer (`desktop.ini`) e locks ocasionais em `clean`, mesmo com o bloqueio principal de autolinking/path resolvido
- O projeto usa `android/.cxx/` como staging curto versionado para reduzir o impacto do CMake/Ninja no Windows
- O warning de `NODE_ENV` tambem aparece no ambiente local; ele nao foi o motivo do build quebrar nesta rodada
- O plugin Vercel do ambiente atual exigiu autenticacao, entao a URL de producao foi inferida a partir da configuracao local/documentacao
