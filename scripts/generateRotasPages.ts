import fs from "fs";
import path from "path";

type RouteStatus = "REAL" | "PLACEHOLDER" | "SUSPEITA";

type PageInfo = {
  route: string;
  file: string;
  context: string;
  status: RouteStatus;
  lines: number;
};

type AuditData = {
  generatedAt: string;
  pages: PageInfo[];
};

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "docs", "estado-rotas");
const AUDIT_JSON = path.join(OUTPUT_DIR, "rotas.json");

const CONTEXTS = [
  { id: "admin", label: "Admin" },
  { id: "loja", label: "Loja" },
  { id: "cafe", label: "Cafe" },
  { id: "academico", label: "Academico" },
  { id: "pessoas", label: "Pessoas" },
  { id: "geral", label: "Geral" },
];

function loadAudit(): AuditData {
  if (!fs.existsSync(AUDIT_JSON)) {
    throw new Error("Arquivo rotas.json não encontrado. Rode scripts/auditarRotas.ts primeiro.");
  }
  const raw = fs.readFileSync(AUDIT_JSON, "utf-8");
  const data = JSON.parse(raw);
  if (!data.pages) {
    throw new Error("rotas.json inválido.");
  }
  return data as AuditData;
}

function buildDocument(contextId: string, pages: PageInfo[], auditTimestamp: string): string {
  const now = new Date();
  const stamp = now.toISOString().replace("T", " ").slice(0, 16);
  const lines: string[] = [];

  const contextLabel = CONTEXTS.find((c) => c.id === contextId)?.label || contextId;
  lines.push(`# Estado atual das rotas - ${contextLabel}`);
  lines.push(`Atualizado em: ${stamp}`);
  lines.push("Fonte: varredura do filesystem (scripts/generateRotasPages.ts)");
  lines.push("Referencia: docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md");
  lines.push(`Auditado em: ${auditTimestamp}`);
  lines.push("");
  lines.push("## Rotas");

  if (!pages.length) {
    lines.push("- Nenhuma rota encontrada para este contexto.");
    return lines.join("\n");
  }

  for (const page of pages) {
    lines.push(`- [${page.status}] ${page.route} - ${page.file} (linhas: ${page.lines})`);
  }

  return lines.join("\n");
}

function writeFileSafe(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

function main() {
  const audit = loadAudit();
  const { pages, generatedAt } = audit;

  for (const ctx of CONTEXTS) {
    const filtered =
      ctx.id === "geral"
        ? [...pages].sort((a, b) => a.route.localeCompare(b.route))
        : pages.filter((p) => p.context === ctx.id).sort((a, b) => a.route.localeCompare(b.route));

    const doc = buildDocument(ctx.id, filtered, generatedAt);
    const outFile = path.join(OUTPUT_DIR, `estado-atual-rotas-${ctx.id}.md`);
    writeFileSafe(outFile, doc);
    console.log(`Gerado ${outFile}`);
  }
}

main();
