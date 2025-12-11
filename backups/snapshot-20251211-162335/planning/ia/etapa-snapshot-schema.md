📘 CONTEXTO

Objetivo desta tarefa:

Criar um script de snapshot de schema do banco Supabase:

comando: npm run snapshot:db (ou pnpm snapshot:db);

implementação em scripts/snapshotDb.ts;

saída em docs/schema-snapshot.json.

Criar uma rota interna GET /api/internal/schema que:

lê o arquivo docs/schema-snapshot.json;

devolve o conteúdo em JSON (para uso pelo painel /admin/ia e pelo GPT interno).

Nível sugerido: High (múltiplos arquivos, inclusão de dependências).
Domínio: Node/TypeScript + Next.js App Router.

✅ PASSO 0 — Backup automático (recomendado)

Antes de qualquer alteração, rode no terminal:

git add .
git commit -m "Backup automático antes de criar snapshot de schema"
git tag -a backup-snapshot-schema-$(date +'%Y-%m-%d-%H-%M') -m "Backup automático antes de criar snapshot de schema"


✅ PASSO 1 — Ajustar package.json (scripts + dependências)

Abra o arquivo package.json na raiz do projeto.

Nas dependências, garanta que existam:

"pg" nas dependencies (ou devDependencies se preferir, mas dependencies é mais seguro para scripts);

"tsx" em devDependencies (caso ainda não exista).

Se não existirem, adicione algo assim (ajustando versão se já houver):

[INÍCIO DO BLOCO] package.json (trechos relevantes)
{
"dependencies": {
...
"pg": "^8.12.0"
},
"devDependencies": {
...
"tsx": "^4.19.0"
},
"scripts": {
...
"snapshot:db": "tsx scripts/snapshotDb.ts"
}
}
[FIM DO BLOCO]

Tome cuidado para não sobrescrever scripts existentes; apenas adicionar "snapshot:db" dentro de "scripts".

✅ PASSO 2 — Criar scripts/snapshotDb.ts

Crie a pasta scripts/ na raiz do projeto se ela ainda não existir.

Crie o arquivo:

scripts/snapshotDb.ts

Coloque o conteúdo abaixo:

[INÍCIO DO BLOCO] scripts/snapshotDb.ts (linha 01)
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

type EnumMap = Record<string, string[]>;

interface ColumnInfo {
column_name: string;
data_type: string;
is_nullable: "YES" | "NO";
column_default: string | null;
}

interface ConstraintInfo {
constraint_name: string;
constraint_type: string;
column_name: string | null;
}

interface IndexInfo {
indexname: string;
indexdef: string;
}

interface TableSnapshot {
schema: string;
name: string;
columns: ColumnInfo[];
constraints: ConstraintInfo[];
indexes: IndexInfo[];
}

interface SchemaSnapshot {
generatedAt: string;
databaseUrlPrefix: string | null;
schema: string;
tables: TableSnapshot[];
enums: EnumMap;
}

/**

Lê a connection string do banco a partir de SUPABASE_DB_URL ou DATABASE_URL.
*/
function getConnectionString(): string {
const conn =
process.env.SUPABASE_DB_URL ||
process.env.DATABASE_URL ||
"";

if (!conn) {
throw new Error(
"Nenhuma connection string encontrada. Defina SUPABASE_DB_URL ou DATABASE_URL no .env.local/.env."
);
}

return conn;
}

async function fetchEnums(client: Client): Promise<EnumMap> {
const res = await client.query<{
enum_name: string;
value: string;
}>( SELECT t.typname AS enum_name, e.enumlabel AS value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' ORDER BY enum_name, e.enumsortorder; );

const enums: EnumMap = {};
for (const row of res.rows) {
if (!enums[row.enum_name]) {
enums[row.enum_name] = [];
}
enums[row.enum_name].push(row.value);
}

return enums;
}

async function fetchTables(client: Client): Promise<Array<{ schema: string; name: string }>> {
const res = await client.query<{
table_schema: string;
table_name: string;
}>( SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name; );

return res.rows.map((r) => ({ schema: r.table_schema, name: r.table_name }));
}

async function fetchColumns(client: Client, table: string): Promise<ColumnInfo[]> {
const res = await client.query<ColumnInfo>(
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position; ,
[table]
);

return res.rows;
}

async function fetchConstraints(client: Client, table: string): Promise<ConstraintInfo[]> {
const res = await client.query<ConstraintInfo>(
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name WHERE tc.table_schema = 'public' AND tc.table_name = $1 ORDER BY tc.constraint_name, kcu.ordinal_position; ,
[table]
);

return res.rows;
}

async function fetchIndexes(client: Client, table: string): Promise<IndexInfo[]> {
const res = await client.query<IndexInfo>(
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 ORDER BY indexname; ,
[table]
);

return res.rows;
}

async function main() {
const connectionString = getConnectionString();
const client = new Client({ connectionString });

console.log("🔌 Conectando ao banco para snapshot de schema...");
await client.connect();

try {
const tables = await fetchTables(client);
const enums = await fetchEnums(client);

const tableSnapshots: TableSnapshot[] = [];

for (const t of tables) {
  console.log(`📦 Lendo estrutura da tabela ${t.schema}.${t.name}...`);
  const [columns, constraints, indexes] = await Promise.all([
    fetchColumns(client, t.name),
    fetchConstraints(client, t.name),
    fetchIndexes(client, t.name),
  ]);

  tableSnapshots.push({
    schema: t.schema,
    name: t.name,
    columns,
    constraints,
    indexes,
  });
}

const snapshot: SchemaSnapshot = {
  generatedAt: new Date().toISOString(),
  databaseUrlPrefix: connectionString.replace(/(:\/\/)([^@]+)@/, "$1***@"),
  schema: "public",
  tables: tableSnapshots,
  enums,
};

const docsDir = path.join(process.cwd(), "docs");
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const targetPath = path.join(docsDir, "schema-snapshot.json");
fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), "utf-8");

console.log(`✅ Snapshot de schema salvo em: ${targetPath}`);


} finally {
await client.end();
console.log("🔌 Conexão com o banco finalizada.");
}
}

main().catch((err) => {
console.error("❌ Erro ao gerar snapshot de schema:", err);
process.exit(1);
});
[FIM DO BLOCO]

Observações importantes:

O script não cria nem altera tabelas, só lê metadata.

Ele exige que exista SUPABASE_DB_URL ou DATABASE_URL no ambiente:

Exemplo de .env.local:

SUPABASE_DB_URL=postgres://user:pass@host:6543/postgres


✅ PASSO 3 — Criar a rota interna /api/internal/schema

Assumindo que o projeto usa Next.js App Router com estrutura src/app/api/...:

Crie a pasta:

src/app/api/internal/schema/

Dentro dela, crie o arquivo:

src/app/api/internal/schema/route.ts

Conteúdo sugerido:

[INÍCIO DO BLOCO] src/app/api/internal/schema/route.ts (linha 01)
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const SNAPSHOT_FILE = path.join(process.cwd(), "docs", "schema-snapshot.json");

/**

Rota interna para expor o snapshot de schema gerado pelo script snapshot:db.

GET /api/internal/schema

Resposta (sucesso):

{

"ok": true,

"schema": { ...conteúdo do schema-snapshot.json... }

}

Resposta (erro):

{

"ok": false,

"error": "SCHEMA_SNAPSHOT_NOT_AVAILABLE",

"detail": "mensagem"

}
*/
export async function GET() {
try {
const raw = await fs.readFile(SNAPSHOT_FILE, "utf-8");
const data = JSON.parse(raw);

return NextResponse.json(
{
ok: true,
schema: data,
},
{ status: 200 }
);
} catch (error: unknown) {
const err = error as Error;

return NextResponse.json(
{
ok: false,
error: "SCHEMA_SNAPSHOT_NOT_AVAILABLE",
detail: err.message,
},
{ status: 500 }
);
}
}
[FIM DO BLOCO]

Fica como TODO futuro: adicionar autenticação/verificação de role para restringir acesso a essa rota apenas ao painel /admin/ia.

✅ PASSO 4 — Lembrar de configurar a connection string

Em algum .env usado localmente (por exemplo .env.local ou .env.development), inclua:

[INÍCIO DO BLOCO] .env.local (exemplo)
SUPABASE_DB_URL=postgres://USER:PASS@HOST:PORT/DBNAME
[FIM DO BLOCO]

Use a connection string apropriada do projeto Conexão Dança (pega em Project Settings → Database no painel Supabase).

✅ PASSO 5 — Como usar depois que os arquivos estiverem criados

Após aplicar estas mudanças:

Instale as dependências se necessário:

npm install
# ou
pnpm install


Gere o snapshot de schema:

npm run snapshot:db
# ou
pnpm snapshot:db


Isso criará/atualizará docs/schema-snapshot.json.

A partir daí:

O GPT interno pode chamar GET /api/internal/schema para obter o estado atual do banco.

O GPT externo + Codex podem usar o arquivo docs/schema-snapshot.json como fonte de verdade para atualizar docs/estado-atual-banco.md, sem depender de download manual do painel Supabase.

Nenhum outro arquivo deve ser alterado além dos citados.
