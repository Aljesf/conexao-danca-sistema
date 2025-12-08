import dotenv from "dotenv";
import { Client } from "pg";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Carrega variáveis de ambiente de .env e .env.local
 */
function loadEnv() {
  // .env padrão
  dotenv.config();
  // .env.local (Next usa muito esse arquivo)
  dotenv.config({ path: ".env.local" });
}

/**
 * Resolve a URL de conexão ao banco.
 * - Prioridade: SUPABASE_DB_URL_DIRECT (se existir)
 * - Caso contrário: SUPABASE_DB_URL
 *   - Se for URL do pooler (.pooler.supabase.com), converte automaticamente
 *     para host direto: db.<project_ref>.supabase.co
 */
function resolveDbUrl(): string {
  const direct = process.env.SUPABASE_DB_URL_DIRECT;
  if (direct) {
    try {
      const url = new URL(direct);
      console.log(
        `🔗 Usando SUPABASE_DB_URL_DIRECT (host: ${url.hostname}, database: ${url.pathname})`
      );
      return url.toString();
    } catch (e) {
      console.warn(
        "⚠️ SUPABASE_DB_URL_DIRECT está definido, mas não é uma URL válida. Ignorando e tentando SUPABASE_DB_URL..."
      );
    }
  }

  const raw = process.env.SUPABASE_DB_URL;
  if (!raw) {
    throw new Error(
      "Nenhuma variável de conexão encontrada. Defina SUPABASE_DB_URL (e opcionalmente SUPABASE_DB_URL_DIRECT) no .env/.env.local."
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch (e) {
    throw new Error("SUPABASE_DB_URL não é uma URL válida.");
  }

  const originalHost = url.hostname;

  // Se já NÃO for pooler, usamos como está
  if (!originalHost.includes("pooler.supabase.com")) {
    console.log(
      `🔗 Usando SUPABASE_DB_URL como está (host: ${url.hostname}, database: ${url.pathname})`
    );
    return url.toString();
  }

  // Se for pooler, tentamos converter:
  // Cenário típico:
  // username: "postgres.<project_ref>"
  // host: "aws-1-sa-east-1.pooler.supabase.com"
  const username = url.username; // ex.: "postgres.bhbohlhathgogvflggdl"
  const [dbUser, projectRef] = username.split(".");

  if (!projectRef) {
    console.warn(
      "⚠️ SUPABASE_DB_URL parece ser de pooler, mas não consegui extrair o project_ref do username. Usando URL original (pode falhar para migrations)."
    );
    console.log(
      `🔗 Usando SUPABASE_DB_URL original (host: ${url.hostname}, database: ${url.pathname})`
    );
    return url.toString();
  }

  // Ajusta para conexão direta
  const newHost = `db.${projectRef}.supabase.co`;
  url.username = dbUser; // normalmente "postgres"
  url.hostname = newHost;
  url.port = "5432"; // porta padrão do Postgres no Supabase

  console.log(
    `🔁 SUPABASE_DB_URL aponta para pooler (${originalHost}). Convertendo automaticamente para host direto (${newHost}).`
  );

  return url.toString();
}

async function main() {
  loadEnv();

  const dbUrl = resolveDbUrl();

  // Caminho da migration da Loja v0
  const sqlFilePath = path.resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "202512041500_loja_v0.sql"
  );

  console.log("🔌 Conectando ao banco para aplicar Loja v0...");
  console.log("📄 Lendo arquivo SQL:", sqlFilePath);

  const sql = await readFile(sqlFilePath, "utf8");

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log("✅ Conexão estabelecida. Aplicando SQL...");

    await client.query("BEGIN;");
    await client.query(sql);
    await client.query("COMMIT;");

    console.log("🎉 Migration Loja v0 aplicada com sucesso no banco.");
  } catch (error) {
    console.error("❌ Erro ao aplicar migration Loja v0. Fazendo ROLLBACK...");
    try {
      await client.query("ROLLBACK;");
    } catch {
      // ignora erro de rollback
    }
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("🔚 Conexão encerrada.");
  }
}

main().catch((err) => {
  console.error("❌ Erro inesperado ao executar applyMigrationLojaV0.ts");
  console.error(err);
  process.exitCode = 1;
});
