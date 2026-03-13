import { CONTEXTOS_CONFIG, detectContextByPathname } from "@/config/contextosConfig";
import type { SuporteUsuarioContexto, SupportLastError, SuporteContextoTela } from "./constants";

const BRANDING_STORAGE_KEY = "ctx-branding-v1";

declare global {
  interface Window {
    __SUPORTE_LAST_ERROR__?: SupportLastError | null;
  }
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

function normalizeUsuario(usuario?: Partial<SuporteUsuarioContexto> | null): SuporteUsuarioContexto {
  return {
    id: typeof usuario?.id === "string" && usuario.id.trim() ? usuario.id : null,
    email: typeof usuario?.email === "string" && usuario.email.trim() ? usuario.email : null,
    nome: typeof usuario?.nome === "string" && usuario.nome.trim() ? usuario.nome : null,
  };
}

export function coletarContextoTela(usuario?: Partial<SuporteUsuarioContexto> | null): SuporteContextoTela {
  const usuarioNormalizado = normalizeUsuario(usuario);

  if (typeof window === "undefined") {
    return {
      pathname: null,
      href: null,
      pageTitle: null,
      contextoSlug: null,
      contextoNome: null,
      usuario: usuarioNormalizado,
      userAgent: null,
      viewport: { largura: null, altura: null },
      timestampIso: new Date().toISOString(),
      lastError: null,
    };
  }

  const pathname = window.location.pathname ?? null;
  const { contextoSlug, contextoNome } = resolveContextoAtual(pathname ?? "");

  return {
    pathname,
    href: window.location.href ?? null,
    pageTitle: document.title ?? null,
    contextoSlug,
    contextoNome,
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
