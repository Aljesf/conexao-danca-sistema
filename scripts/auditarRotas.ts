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

type AuditResult = {
  generatedAt: string;
  pages: PageInfo[];
  quasiRoutes: string[];
  apiRoutes: string[];
  components: string[];
  libEntries: string[];
};

const ROOT = path.resolve(__dirname, "..");
const APP_BASE = path.join(ROOT, "src", "app");
const PRIVATE_BASE = path.join(APP_BASE, "(private)");
const API_BASE = path.join(APP_BASE, "api");
const COMPONENTS_DIR = path.join(ROOT, "src", "components");
const LIB_DIR = path.join(ROOT, "src", "lib");
const OUTPUT_DIR = path.join(ROOT, "docs", "estado-rotas");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function walkFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function readFileSafe(file: string): string {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

function nonEmptyLines(content: string): number {
  return content.split("\n").filter((l) => l.trim().length > 0).length;
}

function detectContext(route: string): string {
  const parts = route.split("/").filter(Boolean);
  const first = parts[0] || "";
  if (first === "admin") return "admin";
  if (first === "loja") return "loja";
  if (first === "cafe") return "cafe";
  if (first === "academico") return "academico";
  if (first === "pessoas") return "pessoas";
  return "outros";
}

function determineStatus(content: string, linesCount: number): RouteStatus {
  const lc = content.toLowerCase();
  if (/(todo|em constru[cç][aã]o|placeholder|em breve)/.test(lc)) {
    return "PLACEHOLDER";
  }
  if (/pageReal/i.test(content) || /from\s+["']@\/app\/\(private\)\/config/i.test(content)) {
    return "REAL";
  }
  if (/redirect\s*\(/i.test(content)) return "REAL";
  if (linesCount < 15) return "PLACEHOLDER";

  const hasDataSignals =
    /(fetch|axios|swr|useeffect|usequery|mutate|loader|prisma|supabase|api\/|router\.push)/i.test(
      content
    ) ||
    /from\s+["']@\/|from\s+["']\.{1,2}\/.*components/i.test(content) ||
    /<table|<form|<input|<select|<textarea|<button|<Card|<DataTable/i.test(content);

  if (linesCount >= 40 && hasDataSignals) return "REAL";
  if (hasDataSignals && linesCount >= 25) return "REAL";
  if (linesCount >= 60) return "REAL";
  return "SUSPEITA";
}

function routeFromPagePath(filePath: string): string {
  const relative = path.relative(APP_BASE, filePath).replace(/\\/g, "/");
  const withoutPrivate = relative.replace(/^\(private\)\//, "");
  const route = withoutPrivate.replace(/\/page\.tsx$/, "");
  return `/${route}`;
}

function findPages(): PageInfo[] {
  const pageFiles = walkFiles(PRIVATE_BASE, (f) => f.endsWith("page.tsx"));
  const pages: PageInfo[] = [];

  for (const file of pageFiles) {
    const content = readFileSafe(file);
    const lines = nonEmptyLines(content);
    const status = determineStatus(content, lines);
    const route = routeFromPagePath(file);
    const context = detectContext(route);
    const relFile = path.relative(ROOT, file).replace(/\\/g, "/");
    pages.push({ route, file: relFile, context, status, lines });
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

function findQuasiRoutes(): string[] {
  const dirs: string[] = [];
  const stack = [PRIVATE_BASE];
  while (stack.length) {
    const current = stack.pop() as string;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    let hasLayout = false;
    let hasRoute = false;
    let hasPage = false;

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (entry.name === "layout.tsx") hasLayout = true;
        if (entry.name === "route.ts") hasRoute = true;
        if (entry.name === "page.tsx") hasPage = true;
      }
    }

    if ((hasLayout || hasRoute) && !hasPage) {
      const relative = path
        .relative(APP_BASE, current)
        .replace(/\\/g, "/")
        .replace(/^\(private\)\//, "");
      dirs.push(`/${relative || ""}`);
    }
  }

  return dirs.sort();
}

function findApiRoutes(): string[] {
  const files = walkFiles(API_BASE, (f) => path.basename(f) === "route.ts");
  return files
    .map((file) => {
      const rel = path.relative(APP_BASE, file).replace(/\\/g, "/");
      return `/${rel.replace(/\\/g, "/").replace(/\/route\.ts$/, "")}`;
    })
    .sort();
}

function listDirEntries(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .sort()
    .map((name) => path.join(path.basename(dir), name).replace(/\\/g, "/"));
}

function saveJson(data: AuditResult) {
  const jsonPath = path.join(OUTPUT_DIR, "rotas.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
}

function buildReport(data: AuditResult): string {
  const { pages, quasiRoutes, apiRoutes, components, libEntries, generatedAt } = data;
  const totals = pages.reduce(
    (acc, p) => {
      acc[p.status] += 1;
      return acc;
    },
    { REAL: 0, PLACEHOLDER: 0, SUSPEITA: 0 } as Record<RouteStatus, number>
  );

  const topLargest = [...pages].sort((a, b) => b.lines - a.lines).slice(0, 20);
  const topSmallest = [...pages].sort((a, b) => a.lines - b.lines).slice(0, 20);

  const lines: string[] = [];
  lines.push("# RELATORIO-DIAGNOSTICO-ROTAS");
  lines.push(`Gerado em: ${generatedAt}`);
  lines.push("Fonte: varredura do filesystem (scripts/auditarRotas.ts)");
  lines.push("");
  lines.push("## A) Rotas reais (page.tsx)");
  for (const page of pages) {
    lines.push(
      `- [${page.status}] ${page.route} - ${page.file} (contexto: ${page.context}, linhas: ${page.lines})`
    );
  }
  lines.push("");
  lines.push("## B) Pastas que parecem rotas mas não são (layout/route sem page.tsx)");
  if (quasiRoutes.length === 0) {
    lines.push("- Nenhuma pasta suspeita encontrada.");
  } else {
    for (const dir of quasiRoutes) {
      lines.push(`- ${dir}`);
    }
  }
  lines.push("");
  lines.push("## C) Arquivos sem rota (inventário útil)");
  lines.push("- src/components: " + (components.length ? components.join(", ") : "sem entradas"));
  lines.push("- src/lib: " + (libEntries.length ? libEntries.join(", ") : "sem entradas"));
  lines.push("- src/app/api (rotas): " + (apiRoutes.length ? apiRoutes.join(", ") : "sem rotas"));
  lines.push("");
  lines.push("## D) Contagens e ranking");
  lines.push(
    `- Totais -> REAL: ${totals.REAL}, PLACEHOLDER: ${totals.PLACEHOLDER}, SUSPEITA: ${totals.SUSPEITA}, Total: ${pages.length}`
  );
  lines.push("- Top 20 maiores páginas (por linhas):");
  for (const p of topLargest) {
    lines.push(`  - ${p.route} (${p.lines} linhas) - ${p.file}`);
  }
  lines.push("- Top 20 menores páginas (por linhas):");
  for (const p of topSmallest) {
    lines.push(`  - ${p.route} (${p.lines} linhas) - ${p.file}`);
  }
  lines.push("");
  lines.push("> Status calculado por heurística simples: REAL (conteúdo/tabelas/fetch), PLACEHOLDER (muito curto ou contém TODO/placeholder), SUSPEITA (mínimo de código sem sinais claros).");

  return lines.join("\n");
}

function main() {
  ensureDir(OUTPUT_DIR);

  const pages = findPages();
  const quasiRoutes = findQuasiRoutes();
  const apiRoutes = findApiRoutes();
  const components = listDirEntries(COMPONENTS_DIR);
  const libEntries = listDirEntries(LIB_DIR);
  const generatedAt = new Date().toISOString();

  const result: AuditResult = {
    generatedAt,
    pages,
    quasiRoutes,
    apiRoutes,
    components,
    libEntries,
  };

  saveJson(result);
  const report = buildReport(result);
  const reportPath = path.join(OUTPUT_DIR, "RELATORIO-DIAGNOSTICO-ROTAS.md");
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`Relatório gerado em ${reportPath}`);
}

main();
