📘 Supabase — Conexão, Snapshot e Diagnóstico Completo
Documentação oficial do projeto Conexão Dança

🧠 Objetivo deste documento
Registrar toda a lógica de funcionamento da conexão com o banco da Supabase, especificamente para:
- Rodar snapshots do banco
- Rodar scripts TypeScript que precisam conectar direto no PostgreSQL
- Resolver erros de credenciais, IPv4/IPv6, pooler e SSL
- Diagnosticar rapidamente qualquer falha de conexão
Este documento serve tanto para consulta futura quanto para uso direto pelo Codex.

1️⃣ Estrutura geral da conexão
O projeto utiliza uma variável de ambiente:
SUPABASE_DB_URL=
Essa variável define como os scripts locais (snapshot, migração, testes, manutenção) se conectam ao PostgreSQL da Supabase.
Existem dois tipos de conexão que o Supabase oferece:

2️⃣ Tipos de Conexões do Supabase
🟥 2.1 Direct Connection (porta 5432)
Exemplo:
postgresql://postgres:[SENHA]@db.<project>.supabase.co:5432/postgres
❗ Problema:
- NÃO funciona em redes IPv4, como a maior parte das redes domésticas no Windows.
- Erros comuns:
  - ENOTFOUND db.<project>.supabase.co
  - Timeouts
- O próprio Supabase alerta:
  - ❌ Not IPv4 compatible — use Session Pooler
🔥 Conclusão:
- Nunca usar Direct Connection em scripts locais no Windows.

🟩 2.2 Session Pooler (porta 5432 ou 6543)
Exemplo:
postgresql://postgres:[SENHA]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
✔ Funciona no Windows
✔ Funciona em IPv4
✔ Aceita credenciais normais
✔ Estável e recomendado para scripts
🔥 Conclusão:
- Esse é o tipo de conexão que o .env.local deve usar SEMPRE no desenvolvimento local.

3️⃣ Como obter a URL certa (Session Pooler)
No painel da Supabase:
- 👉 Home → Connect
- Em Method, selecionar Session Pooler
- Copiar exatamente a URI exibida, por exemplo:
  - postgresql://postgres:[YOUR_PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
- Usar essa URI no .env.local

4️⃣ Ajustando o .env.local
Exemplo correto:
SUPABASE_DB_URL=postgresql://postgres:MINHA_SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
⚠ Importante:
- O usuário sempre é apenas postgres
- A senha deve ser a mesma configurada em: Database → Settings → Reset database password
- Copiar host e porta exatamente como o painel mostra

5️⃣ Diagnóstico — Script oficial de teste
O arquivo existe no repositório:
- scripts/testSupabaseConnection.ts
Ele:
- Carrega .env.local
- Testa a conexão
- Executa SELECT 1
- Exibe erros detalhados
Para rodar:
- npx tsx scripts/testSupabaseConnection.ts
Resultado esperado:
- SUPABASE_DB_URL (mascarada): postgresql://postgres:**@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
- Usuário extraído: postgres
- 🔌 Tentando conectar e executar SELECT 1...
- ✅ ... [ { ok: 1 } ]

6️⃣ Interpretação dos erros
❌ password authentication failed for user "postgres"
- Causas:
  - Usuário incorreto (ex: postgres.<project-id>)
  - Senha antiga
  - Pooler rejeitou a credencial
❌ ENOTFOUND db.<project>.supabase.co
- Causa:
  - Tentativa de usar Direct Connection em rede IPv4
  - → Trocar para Session Pooler
❌ TLS / self signed certificate
- Causa:
  - SSL do Windows
  - No script já usamos: ssl: { rejectUnauthorized: false }

7️⃣ Snapshot do Banco — Funcionamento
O script:
- scripts/snapshotDb.ts
Fluxo:
- Lê o SUPABASE_DB_URL
- Conecta no Supabase
- Extrai o schema
- Gera o arquivo: schema-supabase.sql
Rodar:
- npm run snapshot:db
Se a conexão estiver certa, sempre funcionará.

8️⃣ Fluxo Completo Correto (resumo)
1️⃣ Resetar senha no painel (Se necessário)
2️⃣ Copiar Session Pooler do Supabase
3️⃣ Atualizar .env.local com usuário postgres
4️⃣ Testar
- npx tsx scripts/testSupabaseConnection.ts
5️⃣ Gerar snapshot
- npm run snapshot:db

9️⃣ Tabela de Referência Rápida
Erro | Causa | Solução
password authentication failed | Usuário/senha incorretos | Usar postgres + reset senha
ENOTFOUND db… | Direct Connection em IPv4 | Usar Session Pooler
self signed cert | SSL no Windows | rejectUnauthorized: false
Snapshot falhou | Conexão falhou | Rodar testSupabaseConnection.ts

🔟 Uso pelo Codex
- Quando houver falhas:
  - npx tsx scripts/testSupabaseConnection.ts
- E ajustar conforme o resultado.
- Este documento serve como referência oficial para qualquer manutenção futura.
