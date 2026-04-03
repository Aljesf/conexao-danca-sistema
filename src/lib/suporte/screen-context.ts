import { CONTEXTOS_CONFIG, detectContextByPathname } from "@/config/contextosConfig";
import type { SuporteContextoTela, SuporteUsuarioContexto, SupportLastError } from "./constants";

const BRANDING_STORAGE_KEY = "ctx-branding-v1";

const ENTITY_SEGMENT_LABELS: Record<string, string> = {
  pessoas: "pessoa",
  pessoa: "pessoa",
  alunos: "aluno",
  aluno: "aluno",
  colaboradores: "colaborador",
  colaborador: "colaborador",
  turmas: "turma",
  turma: "turma",
  matriculas: "matricula",
  matricula: "matricula",
  eventos: "evento",
  evento: "evento",
  loja: "loja",
  financeiro: "financeiro",
};

declare global {
  interface Window {
    __SUPORTE_LAST_ERROR__?: SupportLastError | null;
  }
}

function textOrNull(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length ? normalized : null;
}

function normalizeUsuario(usuario?: Partial<SuporteUsuarioContexto> | null): SuporteUsuarioContexto {
  return {
    id: textOrNull(usuario?.id),
    email: textOrNull(usuario?.email),
    nome: textOrNull(usuario?.nome),
  };
}

function resolveContextoAtual(pathname: string) {
  const byPath = detectContextByPathname(pathname);
  if (byPath) {
    return {
      contextoSlug: byPath.href.replace(/^\//, "") || null,
      contextoNome: byPath.label,
    };
  }

  if (typeof window === "undefined") {
    return { contextoSlug: null, contextoNome: null };
  }

  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return { contextoSlug: null, contextoNome: null };

    const parsed = JSON.parse(raw) as { activeContext?: string };
    const current = CONTEXTOS_CONFIG.find((item) => item.brandingKey === parsed.activeContext);

    return {
      contextoSlug: current?.href.replace(/^\//, "") ?? null,
      contextoNome: current?.label ?? null,
    };
  } catch {
    return { contextoSlug: null, contextoNome: null };
  }
}

function queryText(selectors: string[]) {
  if (typeof document === "undefined") return null;

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    const value = textOrNull(element?.innerText ?? element?.textContent ?? null);
    if (value) return value;
  }

  return null;
}

function queryNamedValue(labelPatterns: RegExp[]) {
  if (typeof document === "undefined") return null;

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-support-value], [data-screen-context], dt, th, label, strong, b, h1, h2, h3, p, span, div",
    ),
  );

  for (const candidate of candidates) {
    const ownText = textOrNull(candidate.innerText ?? candidate.textContent ?? null);
    if (!ownText) continue;
    if (!labelPatterns.some((pattern) => pattern.test(ownText))) continue;

    const nextValue = textOrNull(candidate.nextElementSibling?.textContent ?? null);
    if (nextValue && nextValue !== ownText) return nextValue;

    const parentText = textOrNull(candidate.parentElement?.textContent ?? null);
    if (parentText && parentText !== ownText) {
      const normalized = parentText.replace(ownText, "").trim();
      const fallback = textOrNull(normalized);
      if (fallback) return fallback;
    }
  }

  return null;
}

function inferEntityType(pathname: string | null) {
  if (!pathname) return null;

  const parts = pathname.split("/").filter(Boolean);
  for (const part of parts) {
    const normalized = ENTITY_SEGMENT_LABELS[part];
    if (normalized) return normalized;
  }

  return null;
}

function inferEntityId(pathname: string | null) {
  if (!pathname) return null;

  const parts = pathname.split("/").filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!ENTITY_SEGMENT_LABELS[part]) continue;

    const next = parts[index + 1];
    if (!next) continue;
    if (/^[0-9]+$/.test(next)) return next;
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(next)) return next;
  }

  return null;
}

function buildReadableSummary(input: {
  contextoNome: string | null;
  pageTitle: string | null;
  routePath: string | null;
  entityType: string | null;
  entityLabel: string | null;
  alunoNome: string | null;
  responsavelNome: string | null;
  turmaNome: string | null;
  observacoesContexto: string | null;
}) {
  const parts = [
    input.contextoNome ? `Contexto: ${input.contextoNome}` : null,
    input.pageTitle ? `Pagina: ${input.pageTitle}` : null,
    input.routePath ? `Rota: ${input.routePath}` : null,
    input.entityType || input.entityLabel
      ? `Entidade: ${[input.entityType, input.entityLabel].filter(Boolean).join(" - ")}`
      : null,
    input.alunoNome ? `Aluno: ${input.alunoNome}` : null,
    input.responsavelNome ? `Responsavel: ${input.responsavelNome}` : null,
    input.turmaNome ? `Turma: ${input.turmaNome}` : null,
    input.observacoesContexto ? `Observacoes: ${input.observacoesContexto}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : null;
}

export function buildSupportScreenContext(
  usuario?: Partial<SuporteUsuarioContexto> | null,
): SuporteContextoTela {
  const usuarioNormalizado = normalizeUsuario(usuario);

  if (typeof window === "undefined") {
    return {
      pathname: null,
      href: null,
      pageTitle: null,
      contextoSlug: null,
      contextoNome: null,
      entityType: null,
      entityId: null,
      entityLabel: null,
      alunoNome: null,
      responsavelNome: null,
      turmaNome: null,
      observacoesContexto: null,
      resumoLegivel: null,
      usuario: usuarioNormalizado,
      userAgent: null,
      viewport: { largura: null, altura: null },
      timestampIso: new Date().toISOString(),
      lastError: null,
    };
  }

  const pathname = window.location.pathname ?? null;
  const { contextoSlug, contextoNome } = resolveContextoAtual(pathname ?? "");
  const pageTitle = textOrNull(document.title ?? null);
  const entityType = inferEntityType(pathname);
  const entityId = inferEntityId(pathname);
  const entityLabel = queryText([
    "[data-support-entity-label]",
    "[data-screen-context='entity-label']",
    "main h1",
    "h1",
  ]);
  const alunoNome =
    queryText(["[data-support-aluno-nome]", "[data-screen-context='aluno-nome']"]) ??
    (entityType === "aluno" ? entityLabel : null);
  const responsavelNome = queryNamedValue([/^responsavel$/i, /^nome do responsavel$/i]);
  const turmaNome =
    queryText(["[data-support-turma-nome]", "[data-screen-context='turma-nome']"]) ??
    queryNamedValue([/^turma$/i, /^classe$/i]);
  const observacoesContexto =
    queryText(["[data-support-context-note]", "[data-screen-context='observacoes']"]) ??
    queryText(["main h2", "main h3"]);

  const resumoLegivel = buildReadableSummary({
    contextoNome,
    pageTitle,
    routePath: pathname,
    entityType,
    entityLabel,
    alunoNome,
    responsavelNome,
    turmaNome,
    observacoesContexto,
  });

  return {
    pathname,
    href: window.location.href ?? null,
    pageTitle,
    contextoSlug,
    contextoNome,
    entityType,
    entityId,
    entityLabel,
    alunoNome,
    responsavelNome,
    turmaNome,
    observacoesContexto,
    resumoLegivel,
    usuario: usuarioNormalizado,
    userAgent: window.navigator.userAgent ?? null,
    viewport: {
      largura: Number.isFinite(window.innerWidth) ? window.innerWidth : null,
      altura: Number.isFinite(window.innerHeight) ? window.innerHeight : null,
    },
    timestampIso: new Date().toISOString(),
    lastError: window.__SUPORTE_LAST_ERROR__ ?? null,
  };
}

export function collectSupportScreenContext(
  usuario?: Partial<SuporteUsuarioContexto> | null,
) {
  return buildSupportScreenContext(usuario);
}
