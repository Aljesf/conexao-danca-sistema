import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import * as dotenv from "dotenv";

// Carrega variáveis de ambiente a partir de .env.local e .env na raiz do projeto.
// Primeiro tenta .env.local, depois .env como fallback.
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

/**
 * Tipos auxiliares para o snapshot
 */
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
 * Lê a connection string do banco a partir de SUPABASE_DB_URL ou DATABASE_URL.
 */
function getConnectionString(): string {
  const conn =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    "";

  if (!conn) {
    throw new Error(
      "Nenhuma connection string encontrada. Defina SUPABASE_DB_URL ou DATABASE_URL no .env/.env.local."
    );
  }

  return conn;
}

async function fetchEnums(client: Client): Promise<EnumMap> {
  const res = await client.query<{
    enum_name: string;
    value: string;
  }>(
    `
      SELECT t.typname AS enum_name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY enum_name, e.enumsortorder;
    `
  );

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
  }>(
    `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  );

  return res.rows.map((r) => ({ schema: r.table_schema, name: r.table_name }));
}

async function fetchColumns(client: Client, table: string): Promise<ColumnInfo[]> {
  const res = await client.query<ColumnInfo>(
    `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `,
    [table]
  );

  return res.rows;
}

async function fetchConstraints(client: Client, table: string): Promise<ConstraintInfo[]> {
  const res = await client.query<ConstraintInfo>(
    `
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `,
    [table]
  );

  return res.rows;
}

async function fetchIndexes(client: Client, table: string): Promise<IndexInfo[]> {
  const res = await client.query<IndexInfo>(
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY indexname;
    `,
    [table]
  );

  return res.rows;
}

async function main() {
  const connectionString = getConnectionString();

  // Parse manual da connection string para garantir controle total sobre SSL
  const url = new URL(connectionString);

  const client = new Client({
    host: url.hostname,
    port: Number(url.port || "5432"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
  });

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

    const maskedUrl = connectionString.replace(
      /:\/\/([^@]+)@/,
      "://***@"
    );

    const snapshot: SchemaSnapshot = {
      generatedAt: new Date().toISOString(),
      databaseUrlPrefix: maskedUrl,
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
