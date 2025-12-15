import fs from "fs";
import path from "path";

type PageInfo = {
  route: string;
  file: string;
  lines: number;
  matches: string[];
};

const ROOT = path.resolve(__dirname, "..");
const APP_BASE = path.join(ROOT, "src", "app");
const PRIVATE_BASE = path.join(APP_BASE, "(private)");
const OUTPUT = path.join(ROOT, "docs", "estado-rotas", "ADMIN-MAPA-USUARIOS-SEGURANCA.md");

const KEYWORDS = [
  "/api/usuarios",
  "roles_sistema",
  "usuario_roles",
  "profiles",
  "permissoes",
  "permissao",
  "permissions",
  "supabase.from(",
  "createClientComponentClient",
  "createServerComponentClient",
  "auth.getUser",
  "auth.signIn",
  "auth.signOut",
];

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function walkFiles(dir: string, predicate: (f: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      result.push(full);
    }
  }
  return result;
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

function routeFromFile(file: string): string {
  const relative = path.relative(APP_BASE, file).replace(/\\/g, "/");
  const withoutPrivate = relative.replace(/^\(private\)\//, "");
  return `/${withoutPrivate.replace(/\/page\.tsx$/, "")}`;
}

function findMatches(content: string): string[] {
  const hits = new Set<string>();
  const lower = content.toLowerCase();
  for (const kw of KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      hits.add(kw);
    }
  }
  return Array.from(hits);
}

function main() {
  const files = walkFiles(PRIVATE_BASE, (f) => f.endsWith("page.tsx"));
  const candidates: PageInfo[] = [];

  for (const file of files) {
    const content = readFileSafe(file);
    const matches = findMatches(content);
    if (matches.length === 0) continue;
    const route = routeFromFile(file);
    const lines = nonEmptyLines(content);
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    candidates.push({ route, file: rel, lines, matches });
  }

  candidates.sort((a, b) => a.route.localeCompare(b.route));

  const now = new Date().toISOString();
  const out: string[] = [];
  out.push("# ADMIN-MAPA-USUARIOS-SEGURANCA");
  out.push(`Gerado em: ${now}`);
  out.push("Fonte: scripts/mapearTelasSeguranca.ts (varredura do filesystem)");
  out.push("");
  if (candidates.length === 0) {
    out.push("Nenhum candidato forte encontrado.");
  } else {
    out.push("## Candidatos fortes");
    for (const c of candidates) {
      out.push(
        `- ${c.route} (${c.lines} linhas) - ${c.file} | matches: ${c.matches.join(", ")}`
      );
    }
  }

  ensureDir(OUTPUT);
  fs.writeFileSync(OUTPUT, out.join("\n"), "utf-8");
  console.log(`Relatório gerado em ${OUTPUT}`);
}

main();

