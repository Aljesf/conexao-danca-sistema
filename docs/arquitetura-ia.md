📘 ARQUIVO MD OFICIAL — ARQUITETURA DE IA DO SISTEMA CONEXÃO DANÇA

Versão 1.0 – 02/12/2025
Responsável: Alírio de Jesus e Silva Filho
Assistente Técnico: GPT (OpenAI)

🔷 1. Objetivo Geral

Estabelecer a arquitetura oficial para integrar a OpenAI API ao Sistema Conexão Dança, garantindo:

Economia de tokens

Escalabilidade

Segurança

Contexto inteligente

Integração com o Painel Admin

Base para, futuramente, permitir o Modo Full Automático, onde o sistema poderá aplicar mudanças no Supabase com autorização do Administrador.

🔷 2. Princípios Essenciais da Arquitetura
✅ 2.1 Economia como padrão

Toda chamada de IA no sistema será pensada para gastar o mínimo possível, usando:

Modelos leves (ex.: gpt-4.1-mini / gpt-4o-mini)

Prompts curtos

Histórico limitado

Dados carregados do banco, não enviados ao GPT

Resumos e recortes, não tabelas inteiras

✅ 2.2 Modularidade de modelos

Cada chamada poderá definir um mode:

economico → default (GPT-mini)

padrao → equilíbrio

profundo → somente quando realmente necessário

✅ 2.3 Nenhum dado grande será enviado repetidamente

O sistema vai:

armazenar documentos internos (Visão Geral, docs do sistema, estrutura, fluxos);

montar um schema leve para IA;

puxar do Supabase apenas o recorte necessário.

✅ 2.4 Segurança total

O GPT não tem acesso direto ao Supabase.
Toda ação depende de:

backend Next.js

rotas seguras

tokens internos

lógica de autorização (admin)

🔷 3. Componentes Principais da Arquitetura
3.1 Variáveis de Ambiente Necessárias
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

3.2 Cliente Central de IA — openaiClient.ts
Funções:

configurar modelo padrão

permitir mode (economico/padrao/profundo)

expor função adminAskAi()

padronizar respostas

Esse arquivo será o coração de todas as integrações.

3.3 Rota de API — /api/admin/ia

Essa rota:

recebe perguntas do administrador

envia para o GPT usando o cliente central

devolve respostas padronizadas

vai validar permissões no futuro

será responsável por controlar o consumo

3.4 Painel Admin de IA — /admin/ia

Essa página será:

o centro de controle da IA

onde o administrador faz perguntas

onde testes e integrações começam

porta de entrada para módulos avançados

Características:

interface tipo chat

histórico curto

rápido

econômico

retorno imediato

sem gastar tokens com contexto desnecessário

🔷 4. Estratégia de Economia Permanente

A arquitetura inteira foi desenhada para reduzir custos.
Esses são os pilares:

4.1 Modelo baseado em necessidades
mode = economico

default

GPT-mini

consultas rápidas

perguntas do painel

operações simples

mode = padrao

quando a resposta precisar de mais precisão

análises intermediárias

mode = profundo

usado apenas:

para revisões amplas

arquitetura complexa

geração de módulos completos

reorganizações críticas

4.2 Minimizar tokens de entrada

Não mandar SQL bruto

Não mandar documentos completos

Não mandar histórico gigante

Não repetir contexto que já está salvo no backend

4.3 O servidor prepara a informação

Sempre que possível:

o backend busca os dados no Supabase

limpa

filtra

resume

recorta

e manda SÓ o que o GPT precisa

Essa é a chave do custo baixo.

🔷 5. Caminho para o Modo Full Automático

O sistema está sendo preparado para, no futuro, permitir:

✔ O GPT sugerir
✔ O backend validar
✔ O backend aplicar mudanças automaticamente no banco
❗ Mas somente após autorização explícita do Administrador.
Para isso, serão criadas:
5.1 Rota interna segura:
POST /api/internal/db/execute

5.2 Token interno especial

renovável

criptografado

não exposto no front-end

validado pelo servidor

5.3 Modo de execução:

GPT gera a migration

Backend ainda valida

Backend executa

Logs vão para auditoria

🔷 6. Etapas do Desenvolvimento da IA no Sistema
6.1 Etapa 1 — Agora (atual)

Integrar API da OpenAI

Criar cliente openaiClient.ts

Criar rota /api/admin/ia

Criar painel /admin/ia

Testar comunicação

6.2 Etapa 2 — Próxima

Adicionar filtros de segurança (admin only)

Criar endpoint /api/internal/schema

Criar resumo enxuto do Supabase

Integrar o Painel com dados reais

6.3 Etapa 3 — Avançada

Criar endpoint /api/internal/docs (visão geral, fluxos, regras internas)

Criar embedding de documentos opcionais

6.4 Etapa 4 — Modo Full Automático

Criar rota /api/internal/db/execute

Criar mecanismo de autorização

Permitir que o GPT gere migrations

Backend aplica

Auditoria salva logs

🔷 7. Regras Permanentes para o Assistente (GPT)

A partir de agora, sempre que trabalhar com o sistema Conexão Dança, o GPT deverá:

Usar modelo econômico por padrão

Sugerir upgrade de modelo somente quando necessário

Reutilizar máximo de contexto salvo no backend

Pedir apenas recortes específicos do banco

Evitar prompts longos

Manter todas as integrações seguras

Gerar código sempre em estruturas isoladas (Codex)

Nunca tentar acessar Supabase diretamente

Respeitar limites de token e custo

🔷 8. Benefícios dessa Arquitetura

Baixíssimo custo mensal

Segurança máxima

Escalabilidade

Facilidade de manutenção

Preparação para automações avançadas

Integrado naturalmente com o Codex

Evolução contínua

🔷 9. Conclusão Geral

Esta arquitetura coloca o Conexão Dança em um nível profissional, permitindo:

IA no painel administrativo

Sugestões inteligentes

Criação de código no Codex

Integração com banco real

Modo automático futuro

Economia máxima sempre

É o melhor caminho para que:

você desenvolva mais rápido,

com mais controle,

gastando pouco,

e podendo expandir sem limites.