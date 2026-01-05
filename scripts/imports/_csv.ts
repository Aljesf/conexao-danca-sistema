import fs from "node:fs";
import path from "node:path";

export type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  // CSV simples (sem aspas complexas). Para uso interno controlado.
  // Se voce precisar de CSV com aspas e virgulas internas, trocamos por lib robusta depois.
  return line.split(",").map((s) => s.trim());
}

export function readCsv(filePath: string): CsvRow[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(abs, "utf8");

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = cols[c] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

export function requireColumns(rows: CsvRow[], required: string[]): void {
  if (rows.length === 0) return;
  const cols = new Set(Object.keys(rows[0]));
  const missing = required.filter((c) => !cols.has(c));
  if (missing.length > 0) {
    throw new Error(`CSV invalido: faltando colunas obrigatorias: ${missing.join(", ")}`);
  }
}
