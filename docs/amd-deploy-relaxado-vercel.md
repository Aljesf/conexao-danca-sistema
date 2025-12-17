# 📘 AMD — Reversão de Segurança do Deploy (Vercel)

**Projeto:** Sistema Conexão Dança  
**Responsável:** Alírio de Jesus e Silva Filho  
**Escopo:** Configuração de deploy (Vercel / Next.js).  
**Importante:** Este documento NÃO trata de reversão de código. Apenas de rigor de build.

---

## 1. O que significa “segurança do deploy” neste projeto

Neste contexto, segurança do deploy significa:

- Execução obrigatória de `next lint` durante o build
- Execução obrigatória de `next build` sem erros
- Deploy bloqueado automaticamente em caso de erro

Este é o comportamento padrão esperado para produção.

---

## 2. Por que existe o modo de deploy relaxado

Durante fases intensas de desenvolvimento, especialmente em projetos grandes e legados, o rigor total do lint pode impedir o deploy mesmo quando o sistema está funcional.

Para permitir evolução contínua sem perder controle, foi definido um **modo de deploy relaxado**, controlado por variável de ambiente.

---

## 3. Como funciona o modo de deploy relaxado

O modo relaxado é ativado por uma variável de ambiente:

DEPLOY_RELAXED=1

yaml
Copiar código

Quando ativa, o build do Next.js passa a:

- Ignorar erros de ESLint durante o build
- (Opcional) Ignorar erros de TypeScript durante o build

Isso permite que o Vercel conclua o deploy mesmo com erros de lint existentes.

---

## 4. Implementação técnica (Next.js)

O modo relaxado é implementado no arquivo de configuração do Next.js:

- `next.config.js`
- ou `next.config.mjs`
- ou `next.config.ts`

Lógica aplicada:

- Se `DEPLOY_RELAXED === "1"`:
  - `eslint.ignoreDuringBuilds = true`
  - `typescript.ignoreBuildErrors = true` (se necessário)

Sem a variável, o comportamento volta automaticamente ao modo estrito.

---

## 5. Como ATIVAR o modo relaxado no Vercel

1. Acessar o painel do Vercel
2. Ir em **Project → Settings → Environment Variables**
3. Criar variável:
   - **Name:** `DEPLOY_RELAXED`
   - **Value:** `1`
4. Aplicar ao ambiente **Production**
5. Executar novo deploy

---

## 6. Como REVERTER (reativar segurança do deploy)

Para voltar ao modo estrito, **sem desfazer código**:

1. No Vercel:
   - Remover a variável `DEPLOY_RELAXED`
   - ou definir seu valor como `0`
2. Executar novo deploy

Resultado esperado:
- O build volta a exigir lint e build sem erros
- O deploy passa a bloquear automaticamente em caso de falha

---

## 7. O que NÃO faz parte da reversão

Este processo NÃO envolve:

- Reverter commits
- Desfazer correções de lint ou tipagem já feitas
- Alterar lógica de negócio

A reversão é **apenas de configuração de deploy**.

---

## 8. Critério recomendado para voltar ao modo estrito

O modo relaxado deve ser desligado quando:

- `npm run lint` executa sem errors
- `npm run build` executa sem errors
- As páginas principais do sistema estão validadas em produção

---

## 9. Observação sobre ESLint em API e Lib

Atualmente, a regra `@typescript-eslint/no-explicit-any` está desativada apenas em:

- `src/app/api/**`
- `src/lib/**`

Essa decisão é independente do modo relaxado do deploy e pode ser revertida futuramente como etapa de saneamento completo.

---

✔ **FIM DO DOCUMENTO**
