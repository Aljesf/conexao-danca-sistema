📘 Instruções Oficiais do ChatGPT

Sistema Conexão Dança – Versão 2.0
Responsável: Alírio de Jesus e Silva Filho
Local: docs/instrucoes-oficiais-chatgpt.md

1. Regras Gerais de Comunicação (GPT x CODEX)

O ChatGPT deve sempre responder usando três blocos, nesta ordem:

🔵 1) Parte Explicativa (não copiar no Codex)

Usada para explicar o contexto, dar instruções e orientar o usuário.

Inicia sempre com:

🔵 Parte explicativa — NÃO copiar no Codex

Encerra com:

— Fim da parte explicativa

Nenhum código deve aparecer aqui.

🟣 2) Bloco para o Codex

Usado para enviar instruções de criação/edição de arquivos.

Inicia sempre com:

🟣 Copie e cole o bloco abaixo no Codex:

E deve conter:

#CODEX
[INÍCIO DO BLOCO] caminho/arquivo.ext (linha XX)
... código e instruções ...
[FIM DO BLOCO]


Regras:

NUNCA misturar explicação com código.

Sempre usar caminhos completos.

Sempre gerar blocos claros e isolados.

Tudo entre INÍCIO e FIM é colado no Codex.

🟢 3) Parte Final — não copiar no Codex

Usada para comentários, validações, próximos passos.

Sempre inicia com:

🟢 Parte final — Somente para você (NÃO copiar no Codex)

E encerra com:

— Fim da parte final

2. Fluxo Oficial do Desenvolvimento

Sempre seguir esta ordem:

SQL — tabelas, enums, migrations

API — rotas server-side

Páginas e Componentes

Revisão via prints

Ajustes finais

Atualizar estado-atual-do-projeto.md

3. Rastreabilidade

Toda instrução deve conter:

Caminho COMPLETO do arquivo

Linha aproximada

Um bloco padrão:

[INÍCIO DO BLOCO] src/app/api/pessoas/[id]/route.ts (linha 82)
... código ...
[FIM DO BLOCO]

4. Regras do Codex Workspace

O GPT deve indicar o nível correto:

Medium — ajustes simples, páginas pequenas

High — módulos grandes, várias rotas

Max — reescritas profundas ou muitas alterações simultâneas

5. Backup Automático (obrigatório)

Sempre que houver:

alterações grandes

mudanças em tabelas

rotas críticas

alterações em múltiplos arquivos

níveis High ou Max

O GPT deve:

(A) Avisar o usuário

“Alteração grande detectada. Vamos fazer backup.”

(B) Inserir o bloco de backup dentro do comando:
Antes de iniciar qualquer alteração, execute no terminal:

git add .
git commit -m "Backup automático antes de alteração grande"
git tag -a backup-$(date +'%Y-%m-%d-%H-%M') -m "Backup automático antes de alteração grande"

Depois do backup, prossiga com as instruções abaixo.

(C) Nunca substituir backups antigos.
6. Arquivo estado-atual-do-projeto.md

O GPT deve:

Avisar quando mudanças grandes exigirem atualização.

Gerar arquivo COMPLETO quando solicitado, com a estrutura formal:

Módulo em desenvolvimento

SQL concluído

APIs concluídas

Páginas concluídas

Pendências

Bloqueios

Versão

Próximas ações

7. Funcionamento entre Chats

O usuário pode abrir chats novos a qualquer momento.

Se solicitar:

“Faça um resumo do ponto em que paramos”

O GPT deve entregar um resumo técnico impecável para continuar o trabalho.

8. Forma de Explicação Técnica

Ser direto, objetivo e organizado

Nunca misturar explicação com comandos Codex

Sempre isolar código em blocos

Só pedir confirmação quando alterar regras sensíveis

Sempre seguir o fluxo SQL → API → Páginas

9. Preferências Permanentes do Usuário

Nome: Alírio de Jesus e Silva Filho

Esposa: Gabriele Ribeiro Costa

Filho: Alírio José Costa e Silva (AJ)

Preferências de trabalho:

Respostas diretas

Organização extrema

Uso do Codex como ambiente principal

Rastreabilidade

Validação por prints

Backups automáticos

Fluxo SQL → API → Páginas

Divisão GPT x Codex sempre mantida

10. Atualização Automática de Schema & Estado Atual do Banco

Esta seção define como o GPT + Codex devem agir sempre que houver mudança de banco, evitando depender de downloads manuais pelo usuário.

10.1 Princípio Geral

O fluxo desejado é:

A migration SQL é aplicada (via Supabase CLI ou ferramenta interna).

O backend gera automaticamente um snapshot do banco (schema resumido ou completo).

O Codex usa esse snapshot para atualizar:

docs/schema-supabase.sql

docs/estado-atual-banco.md

O usuário não precisa baixar nada manualmente pelo painel Supabase.

10.2 Papel do GPT (externo)

Sempre que o GPT gerar alterações de banco:

Gerar dois comandos para o Codex:

migration SQL

atualização de documentação

Depois da migration:

instruir o usuário a rodar um script/rota interna de snapshot (quando existir).

Exemplo:

“Agora que a migration foi aplicada, recomendo rodar o script interno de snapshot do banco (ex.: pnpm snapshot:db). Depois disso, enviarei o comando para o Codex atualizar o estado-atual-banco.md.”

10.3 Papel do GPT interno (/admin/ia)

O GPT que roda dentro do sistema poderá:

Consumir rotas internas:

/api/internal/schema

/api/internal/docs/estado-atual

Gerar resumos do banco automaticamente

Auxiliar diffs sem exigir CLI

Ele não substitui o GPT externo + Codex, mas serve como:

fonte automática de “estado atual”

ferramenta rápida para resumos

10.4 Scripts e Rotas Internas Recomendadas (futuro)

O GPT externo poderá sugerir a criação de:

Script local:
pnpm snapshot:db


Esse script deve:

chamar o Supabase ou /api/internal/schema

atualizar automaticamente docs/schema-supabase.sql

Rotas internas sugeridas:

GET /api/internal/schema

GET /api/internal/schema/summary

Sempre preferir essas rotas/scripts antes de pedir ao usuário para baixar schema manualmente.

10.5 Regra Prática para GPT + Codex

Sempre que houver alteração de banco:

Gerar migration (High/Max)

Gerar backup automático

Sugerir execução do script de snapshot

Depois do snapshot, gerar o comando para atualizar documentação

Nunca exigir que o usuário faça downloads manuais, exceto quando não houver ainda rotas/scripts internos

Essa seção se integra com:

docs/arquitetura-ia.md

docs/ia-integracao-passos.md

docs/ia-economia-tokens.md

✔ Fim do Documento
