import dotenv from "dotenv";
import { Client } from "pg";

//
// Carrega primeiro o .env.local (onde está o SUPABASE_DB_URL),
// depois o .env como fallback.
//
dotenv.config({ path: ".env.local" });
dotenv.config(); // .env padrão, se existir

function extractUserFromConnectionString(conn: string): string | null {
  // conn = "postgresql://user:password@host:port/db?..."
  const withoutProtocol = conn.replace(/^postgres(ql)?:\/\//, "");
  const atIndex = withoutProtocol.indexOf("@");
  if (atIndex === -1) return null;
  const authPart = withoutProtocol.slice(0, atIndex); // "user:password"
  const colonIndex = authPart.indexOf(":");
  if (colonIndex === -1) return authPart || null;
  return authPart.slice(0, colonIndex) || null;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error(
      "❌ SUPABASE_DB_URL não encontrada no ambiente (nem em .env.local, nem em .env)."
    );
    process.exit(1);
  }

  const masked = connectionString.replace(
    /(postgres(ql)?:\/\/[^:]+:)[^@]+(@.)/,
    "$1**$3"
  );
  const user = extractUserFromConnectionString(connectionString);

  console.log("🔍 SUPABASE_DB_URL (mascarada):", masked);
  console.log(
    "👤 Usuário extraído da connection string:",
    user ?? "<não encontrado>"
  );

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Tentando conectar e executar SELECT 1...");
    await client.connect();
    const result = await client.query("SELECT 1 AS ok");
    console.log("✅ Conexão bem sucedida. Resultado:", result.rows);
  } catch (err: any) {
    console.error("❌ Erro ao conectar/executar SELECT 1:");
    console.error(" message:", err?.message);
    console.error(" code :", err?.code);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("❌ Erro inesperado no script de teste:", err);
  process.exit(1);
});
