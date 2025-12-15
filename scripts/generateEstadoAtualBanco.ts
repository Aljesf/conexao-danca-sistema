import fs from "fs";
import path from "path";

type TableDefinition = {
  name: string;
  columns: { name: string; type: string }[];
};

function loadSchema(): string {
  const schemaPath = path.resolve(__dirname, "..", "docs", "schema-supabase.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Arquivo de schema não encontrado em ${schemaPath}`);
  }
  return fs.readFileSync(schemaPath, "utf-8");
}

function parseTables(schema: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const regex =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(?:"?([a-zA-Z0-9_]+)"?)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(schema)) !== null) {
    const [, tableName, body] = match;
    const columns: { name: string; type: string }[] = [];
    const lines = body.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/,$/, "");
      if (!line || line.startsWith("--")) continue;
      const lower = line.toLowerCase();
      if (
        lower.startsWith("constraint") ||
        lower.startsWith("primary key") ||
        lower.startsWith("unique") ||
        lower.startsWith("foreign key") ||
        lower.startsWith("check")
      ) {
        continue;
      }
      const colMatch = /^"?(?<name>[a-zA-Z0-9_]+)"?\s+(?<type>.+)$/u.exec(line);
      if (colMatch?.groups?.name) {
        const colName = colMatch.groups.name;
        const colType = (colMatch.groups.type || "").trim();
        columns.push({ name: colName, type: colType });
      }
    }

    tables.push({ name: tableName, columns });
  }

  return tables.sort((a, b) => a.name.localeCompare(b.name));
}

function formatMarkdown(tables: TableDefinition[]): string {
  const now = new Date();
  const stamp = now.toISOString().replace("T", " ").slice(0, 16);
  const totalTables = tables.length;

  const lines: string[] = [];
  lines.push("# Estado Atual do Banco de Dados");
  lines.push(`Atualizado em: ${stamp}`);
  lines.push("Fonte: docs/schema-supabase.sql (snapshot real)");
  lines.push("");
  lines.push(`Total de tabelas: ${totalTables}`);
  lines.push("");
  lines.push("> Documento gerado automaticamente por scripts/generateEstadoAtualBanco.ts. Use o snapshot como verdade oficial.");
  lines.push("");
  for (const table of tables) {
    lines.push(`## ${table.name}`);
    if (!table.columns.length) {
      lines.push("- (sem colunas detectadas)");
      lines.push("");
      continue;
    }
    for (const col of table.columns) {
      lines.push(`- ${col.name}: ${col.type}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  try {
    const schema = loadSchema();
    const tables = parseTables(schema);
    const markdown = formatMarkdown(tables);
    const outPath = path.resolve(__dirname, "..", "docs", "estado-atual-banco.md");
    fs.writeFileSync(outPath, markdown, "utf-8");
    console.log(`Resumo do banco atualizado em ${outPath}`);
  } catch (err) {
    console.error("Erro ao gerar estado atual do banco:", err);
    process.exit(1);
  }
}

main();
