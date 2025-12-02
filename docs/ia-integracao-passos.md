📘 ia-integracao-passos.md

Documento Oficial — Passo a Passo da Integração da IA (GPT API) com o Sistema Conexão Dança

Este arquivo vai seguir o mesmo padrão profissional dos outros documentos do projeto — organizado, rastreável, objetivo e pronto para salvar na pasta docs/.

Ele NÃO contém comandos para o Codex (porque é documentação).
É um documento estável, que registra:

pré-requisitos

variáveis de ambiente

instalação

criação do cliente de IA

rota /api/admin/ia

página /admin/ia

testes iniciais

próximos passos

👉 Este arquivo já considera os princípios de economia, mas sem aprofundar (que será o próximo documento).

Agora já vou gerar o conteúdo completo abaixo.

— Fim da parte explicativa

🟣 Copie e cole o bloco abaixo no Codex:

# 📘 IA — Passo a Passo Oficial de Integração  
Sistema Conexão Dança — Integração da OpenAI API  
Versão: 1.0  
Data: 02/12/2025  
Responsável: Alírio de Jesus e Silva Filho  
Assistente Técnico: GPT (OpenAI)

---

# 🔷 1. Objetivo do Documento

Este documento descreve **todas as etapas práticas**, técnicas e organizacionais para integrar a **OpenAI API** ao Sistema Conexão Dança, possibilitando:

- Painel de IA no Contexto Administração  
- Comunicação interna com o GPT (assistente administrativo)  
- Base técnica para automações futuras  
- Preparação do sistema para o “Modo Full Automático”

Este é um documento OPERACIONAL, complementar ao documento arquitetural:

📄 `arquitetura-ia.md`

---

# 🔷 2. Pré-requisitos

Antes de integrar a IA ao sistema, é obrigatório:

### ✔ 2.1 Ativar o Billing na OpenAI  
Acessar https://platform.openai.com → **Billing** → Add payment method.

### ✔ 2.2 Criar uma API Key  
Menu “API Keys” → Create New Key.

### ✔ 2.3 Criar/editar o arquivo `.env.local`
Inserir:



OPENAI_API_KEY=CHAVE_SECRETA_AQUI
OPENAI_MODEL=gpt-4.1-mini

⚠️ *O `.env.local` nunca é commitado no GitHub; usado apenas no servidor local e no deploy.*

---

# 🔷 3. Instalar a biblioteca oficial da OpenAI

No terminal do projeto:



pnpm add openai


ou, se necessário:



npm install openai

ou

yarn add openai


---

# 🔷 4. Criar o Cliente de IA — `src/lib/openaiClient.ts`

Este arquivo centraliza:

- criação do cliente  
- gestão dos modelos  
- função `adminAskAi` para o painel  
- suporte a “mode: economico | padrao | profundo” (extensível)

Funções principais:

- carregar API Key  
- definir modelo padrão (econômico)  
- aceitar mensagens estilo chat  
- retornar resposta padronizada

Esse arquivo é a base para todas as rotas e módulos que usarem IA.

---

# 🔷 5. Criar a Rota de API — `/api/admin/ia`

Local: `src/app/api/admin/ia/route.ts`

Função:

- receber perguntas do painel  
- validar a estrutura  
- enviar para `adminAskAi`  
- devolver a resposta  
- (futuro) validar se o usuário é admin  
- (futuro) injetar contexto salvo no sistema

Entrada esperada:

```json
{
  "messages": [
    { "role": "system", "content": "contexto inicial..." },
    { "role": "user", "content": "minha pergunta" }
  ]
}


Saída:

{
  "answer": {
    "role": "assistant",
    "content": "resposta do GPT..."
  }
}

🔷 6. Criar a Página do Painel de IA — /admin/ia

Local:
src/app/(private)/admin/ia/page.tsx

Funções desta página:

✔ Interface tipo chat

lista mensagens

exibe perguntas (lado direito)

exibe respostas do GPT (lado esquerdo)

✔ Input controlado

textarea

enviar com botão

enviar com CTRL+ENTER

✔ Chamada via fetch

POST /api/admin/ia

✔ Histórico curto

Apenas as últimas mensagens para economia de tokens.

✔ System Prompt Interno

Define:

“Você é o assistente administrativo do Sistema Conexão Dança.”

🔷 7. Teste Inicial da Integração

Após instalar tudo:

Rodar pnpm dev

Acessar:
http://localhost:3000/admin/ia

Digitar:
“Você está funcionando?”

Verificar se aparece a resposta do GPT

Se funcionar:

🎉 O Painel de IA está oficialmente instalado.

🔷 8. Fluxo Técnico da Comunicação

Fluxo de dados:

Página Admin → API /admin/ia → Cliente OpenAI → GPT
                                    ↓
                      Resposta → API → Página Admin


Em detalhes:

Usuário digita pergunta no painel

Página cria array de mensagens

Envia via fetch para o backend

Rota valida, chama adminAskAi

Cliente envia para GPT

GPT responde

Backend devolve JSON

Página exibe resposta no chat

🔷 9. Segurança (implementação futura obrigatória)

Após instalar e estabilizar o painel, serão aplicadas camadas de segurança:

9.1 Proteção por sessão Supabase

Só usuários com profiles.is_admin = true acessam.

9.2 Token interno da rota

Authorization: Bearer CHAVE_INTERNA

9.3 Logs de Auditoria

Cada chamada registrada em:

auditoria_logs

tipo: “GPT_ADMIN_IA_CALL”

payload: pergunta/resumo da resposta

🔷 10. Preparação para o Modo Full Automático

O que será necessário no futuro:

✔ 10.1 Rota interna segura
POST /api/internal/db/execute

✔ 10.2 Token interno exclusivo

nunca exposto ao front-end

validado no backend

✔ 10.3 Execução controlada de SQL

GPT sugere

backend executa

logs na auditoria

✔ 10.4 Confirmação antes de qualquer mudança sensível

Pop-up administrativo para confirmar:

“Deseja aplicar esta alteração no banco?”

🔷 11. Estrutura Recomendada do Repositório
docs/
  arquitetura-ia.md
  ia-integracao-passos.md   ← ESTE ARQUIVO
  ia-economia-tokens.md     ← PRÓXIMO A SER GERADO
src/
  lib/openaiClient.ts
  app/api/admin/ia/route.ts
  app/(private)/admin/ia/page.tsx

🔷 12. Checklist Oficial de Instalação
✔ Adicionar API Key
✔ Instalar biblioteca OpenAI
✔ Criar openaiClient.ts
✔ Criar rota /api/admin/ia
✔ Criar página /admin/ia
✔ Testar comunicação
✔ Integrar na Sidebar (futuro)
✔ Habilitar segurança admin-only (futuro)
✔ Conectar com schema e docs internos (futuro)
🔷 13. Conclusão

Este documento estabelece o passo a passo oficial e seguro para integrar a IA ao sistema, garantindo:

simplicidade

rastreabilidade

economia

escalabilidade

compatibilidade com o Codex

evolução até automação total no futuro

A partir deste ponto, o sistema está formalmente preparado para:

👉 Usar IA dentro do Contexto Administrador
👉 Ser ampliado para entender tabelas, docs e fluxos internos
👉 Evoluir para automações avançadas
✔ Fim do documento — ia-integracao-passos.md

🟢 Parte final — Somente para você (NÃO copiar no Codex)  