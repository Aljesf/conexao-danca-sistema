import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type SchemaResponse =
  | {
      source: "file";
      sqlDump: string;
      lastUpdated: string | null;
    }
  | {
      source: "file";
      error: string;
    };

// Arquivo de schema padronizado dentro de /docs
// Certifique-se de que o arquivo exista em: docs/schema-supabase.md
const SCHEMA_FILE_RELATIVE = "docs/schema-supabase.sql";

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const schemaFilePath = path.join(projectRoot, SCHEMA_FILE_RELATIVE);

    const sqlDump = await fs.readFile(schemaFilePath, "utf8");

    let lastUpdated: string | null = null;
    try {
      const stats = await fs.stat(schemaFilePath);
      lastUpdated = stats.mtime.toISOString();
    } catch {
      lastUpdated = null;
    }

    const body: SchemaResponse = {
      source: "file",
      sqlDump,
      lastUpdated,
    };

    return NextResponse.json(body);
  } catch (error: any) {
    console.error("[API /api/internal/schema] Erro ao ler arquivo:", error);

    const body: SchemaResponse = {
      source: "file",
      error:
        "Não foi possível ler o arquivo de schema (Tabelasa Supabase.md). Verifique se ele existe em /docs ou ajuste SCHEMA_FILE_RELATIVE.",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
