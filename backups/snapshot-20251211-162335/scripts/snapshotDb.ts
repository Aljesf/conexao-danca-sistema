import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { Client } from "pg";

// Carrega envs: primeiro .env.local, depois .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const rawDbUrl = process.env.SUPABASE_DB_URL;

if (!rawDbUrl) {
  console.error(
    "❌ SUPABASE_DB_URL não encontrada após carregar .env.local e .env"
  );
} else {
  console.log(
    "🔍 SUPABASE_DB_URL encontrada (iniciais):",
    rawDbUrl.slice(0, 40) + "..."
  );
}

async function main() {
  try {
    console.log("🔌 Conectando ao banco para gerar snapshot de schema...");

    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      console.error("❌ Variável de ambiente SUPABASE_DB_URL não definida.");
      process.exit(1);
    }

    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    const outputPath = "schema-supabase.sql";
    console.log(`📦 Destino do snapshot: ${outputPath}`);

    const tablesResult = await client.query<{
      table_name: string;
    }>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
    );

    const tables = tablesResult.rows.map((r) => r.table_name);

    let output = "";
    output += `-- Snapshot do schema gerado em ${new Date().toISOString()}\n`;
    output += `-- Fonte: SUPABASE_DB_URL\n\n`;

    for (const tableName of tables) {
      output += `-- --------------------------------------------------\n`;
      output += `-- Tabela: public."${tableName}"\n`;
      output += `-- --------------------------------------------------\n`;

      const colsResult = await client.query<{
        column_name: string;
        data_type: string;
        is_nullable: "YES" | "NO";
        column_default: string | null;
      }>(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `,
        [tableName]
      );

      const colDefs = colsResult.rows.map((col) => {
        const parts: string[] = [];
        parts.push(`"${col.column_name}"`);
        parts.push(col.data_type);
        if (col.is_nullable === "NO") {
          parts.push("NOT NULL");
        }
        if (col.column_default) {
          parts.push(`DEFAULT ${col.column_default}`);
        }
        return "  " + parts.join(" ");
      });

      output += `CREATE TABLE public."${tableName}" (\n`;
      if (colDefs.length > 0) {
        output += colDefs.join(",\n") + "\n";
      }
      output += ");\n\n";
    }

    await client.end();

    writeFileSync(outputPath, output, { encoding: "utf-8" });
    console.log("✅ Snapshot de schema gerado em", outputPath);
  } catch (err) {
    console.error("❌ Erro ao gerar snapshot de schema:", err);
    process.exit(1);
  }
}

main();
