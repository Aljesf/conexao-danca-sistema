import fs from "fs";
import path from "path";

type RouteStatus = "REAL" | "PLACEHOLDER" | "SUSPEITA";

type PageInfo = {
  route: string;
  file: string;
  status: RouteStatus;
  lines: number;
};

type Candidate = PageInfo & {
  categoria: string;
  adminAlias: string;
  adminStatus?: RouteStatus;
};

const ROOT = path.resolve(__dirname, "..");
const APP_BASE = path.join(ROOT, "src", "app");
const PRIVATE_BASE = path.join(APP_BASE, "(private)");
const OUTPUT = path.join(ROOT, "docs", "estado-rotas", "ADMIN-MAPA-ROTAS-FORA-DO-ADMIN.md");

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function walkFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out;
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

function determineStatus(content: string, lines: number): RouteStatus {
  const lc = content.toLowerCase();
  if (/(todo|em constru[cç][aã]o|placeholder|em breve)/.test(lc)) return "PLACEHOLDER";
  if (/redirect\s*\(/i.test(content)) return "REAL";
  if (lines < 15) return "PLACEHOLDER";

  const hasSignals =
    /(fetch|axios|swr|useeffect|usequery|mutate|loader|supabase|api\/|router\.push)/i.test(content) ||
    /from\s+["']@\/|from\s+["']\.{1,2}\/.*components/i.test(content) ||
    /<table|<form|<input|<select|<textarea|<button|<Card|<DataTable/i.test(content);

  if (lines >= 40 && hasSignals) return "REAL";
  if (hasSignals && lines >= 25) return "REAL";
  if (lines >= 60) return "REAL";
  return "SUSPEITA";
}

function routeFromFile(file: string): string {
  const relative = path.relative(APP_BASE, file).replace(/\\/g, "/");
  const withoutPrivate = relative.replace(/^\(private\)\//, "");
  return `/${withoutPrivate.replace(/\/page\.tsx$/, "")}`;
}

function isAdminCandidate(route: string): boolean {
  if (route.startsWith("/admin")) return false;
  const first = route.split("/")[1] || "";
  if (["config", "relatorios", "financeiro", "comercial"].includes(first)) return true;
  if (route.includes("colaborad")) return true;
  if (route.includes("perfi") || route.includes("permiss")) return true;
  if (route.includes("auditoria")) return true;
  return false;
}

function categoriaSugerida(route: string): string {
  if (route.includes("colaborad")) return "COLABORADORES";
  if (route.includes("perfi") || route.includes("permiss")) return "SEGURANCA";
  if (route.startsWith("/relatorios")) return "RELATORIOS";
  if (route.startsWith("/financeiro")) return "FINANCEIRO";
  if (route.startsWith("/comercial") || route.startsWith("/loja")) return "LOJA";
  if (route.startsWith("/config")) return "CONFIG";
  if (route.includes("auditoria")) return "AUDITORIA";
  return "OUTROS";
}

function adminAliasFor(route: string): string {
  if (route.startsWith("/config")) return "/admin" + route;
  if (route.startsWith("/relatorios")) return "/admin" + route;
  if (route.startsWith("/financeiro")) return "/admin" + route;
  if (route.startsWith("/comercial")) return "/admin" + route;
  const colIdx = route.indexOf("/colaboradores");
  if (colIdx >= 0) return "/admin" + route.slice(colIdx);
  return "/admin" + route;
}

function main() {
  const files = walkFiles(PRIVATE_BASE, (f) => f.endsWith("page.tsx"));
  const pages: PageInfo[] = files.map((file) => {
    const content = readFileSafe(file);
    const lines = nonEmptyLines(content);
    const status = determineStatus(content, lines);
    const route = routeFromFile(file);
    const relFile = path.relative(ROOT, file).replace(/\\/g, "/");
    return { route, file: relFile, status, lines };
  });

  const adminRoutes = new Map<string, PageInfo>();
  pages
    .filter((p) => p.route.startsWith("/admin"))
    .forEach((p) => adminRoutes.set(p.route, p));

  const candidates: Candidate[] = [];

  for (const page of pages) {
    if (!isAdminCandidate(page.route)) continue;
    const categoria = categoriaSugerida(page.route);
    if (categoria === "OUTROS") continue;
    const adminAlias = adminAliasFor(page.route);
    const adminStatus = adminRoutes.get(adminAlias)?.status;
    candidates.push({ ...page, categoria, adminAlias, adminStatus });
  }

  candidates.sort((a, b) => a.route.localeCompare(b.route));

  const conflicts = candidates
    .filter((c) => c.adminStatus)
    .map(
      (c) =>
        `- ${c.adminAlias} (${c.adminStatus}) <- ${c.route} (${c.status}) [${c.categoria}] arquivo ${c.file}`
    );

  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push("# ADMIN-MAPA-ROTAS-FORA-DO-ADMIN");
  lines.push(`Gerado em: ${now}`);
  lines.push("Fonte: scripts/mapearRotasAdminForaDoAdmin.ts (varredura do filesystem)");
  lines.push("");
  lines.push("## Rotas de interesse fora do /admin");
  if (candidates.length === 0) {
    lines.push("- Nenhuma rota de admin encontrada fora do /admin.");
  } else {
    for (const c of candidates) {
      lines.push(
        `- ${c.route} -> ${c.adminAlias} [categoria ${c.categoria}] [status ${c.status}] arquivo ${c.file}`
      );
    }
  }
  lines.push("");
  lines.push("## Conflitos (já existe algo em /admin)");
  if (conflicts.length === 0) {
    lines.push("- Nenhum conflito encontrado.");
  } else {
    conflicts.forEach((c) => lines.push(c));
  }

  ensureDir(OUTPUT);
  fs.writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
  console.log(`Relatório gerado em ${OUTPUT}`);
}

main();
